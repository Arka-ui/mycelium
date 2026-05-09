use anyhow::{anyhow, Result};
use base64::Engine as _;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};
use wasmtime::{Engine, Instance, Module, Store};

#[derive(Debug, Deserialize)]
struct Request {
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Serialize)]
struct Response {
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<RpcError>,
}

#[derive(Debug, Serialize)]
struct RpcError {
    code: i32,
    message: String,
}

#[derive(Deserialize)]
struct InstallParams {
    plugin_id: String,
    wasm_b64: String,
    expected_blake3: Option<String>,
}

#[derive(Deserialize)]
struct InvokeParams {
    plugin_id: String,
    function: String,
    arg_i32: Option<i32>,
}

#[derive(Deserialize)]
struct InvokeStringParams {
    plugin_id: String,
    function: String,
    input: String,
}

struct Loaded {
    module: Module,
}

struct State {
    engine: Engine,
    plugins: HashMap<String, Loaded>,
}

impl State {
    fn new() -> Result<Self> {
        let mut config = wasmtime::Config::new();
        config.consume_fuel(true);
        let engine = Engine::new(&config).map_err(|e| anyhow!("engine: {e}"))?;
        Ok(Self {
            engine,
            plugins: HashMap::new(),
        })
    }
}

async fn op_install(state: Arc<Mutex<State>>, p: InstallParams) -> Result<Value> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&p.wasm_b64)
        .map_err(|e| anyhow!("invalid base64: {e}"))?;
    if let Some(expected) = p.expected_blake3.as_deref() {
        let actual = blake3::hash(&bytes).to_hex().to_string();
        if actual != expected {
            return Err(anyhow!(
                "blake3 mismatch: expected={expected} actual={actual}"
            ));
        }
    }
    let mut st = state.lock().await;
    let module = Module::new(&st.engine, &bytes).map_err(|e| anyhow!("module: {e}"))?;
    st.plugins.insert(p.plugin_id.clone(), Loaded { module });
    Ok(json!({"installed": true, "plugin_id": p.plugin_id}))
}

async fn op_invoke(state: Arc<Mutex<State>>, p: InvokeParams) -> Result<Value> {
    let st = state.lock().await;
    let loaded = st
        .plugins
        .get(&p.plugin_id)
        .ok_or_else(|| anyhow!("plugin not installed: {}", p.plugin_id))?;
    let mut store: Store<()> = Store::new(&st.engine, ());
    store
        .set_fuel(10_000_000)
        .map_err(|e| anyhow!("fuel: {e}"))?;
    let instance =
        Instance::new(&mut store, &loaded.module, &[]).map_err(|e| anyhow!("instance: {e}"))?;
    let func = instance
        .get_typed_func::<i32, i32>(&mut store, &p.function)
        .map_err(|e| anyhow!("function not found: {e}"))?;
    let arg = p.arg_i32.unwrap_or(0);
    let result = func
        .call(&mut store, arg)
        .map_err(|e| anyhow!("call: {e}"))?;
    Ok(json!({"result_i32": result, "fuel_consumed": 10_000_000 - store.get_fuel().unwrap_or(0)}))
}

async fn op_invoke_string(state: Arc<Mutex<State>>, p: InvokeStringParams) -> Result<Value> {
    let st = state.lock().await;
    let loaded = st
        .plugins
        .get(&p.plugin_id)
        .ok_or_else(|| anyhow!("plugin not installed: {}", p.plugin_id))?;
    let mut store: Store<()> = Store::new(&st.engine, ());
    store
        .set_fuel(50_000_000)
        .map_err(|e| anyhow!("fuel: {e}"))?;
    let instance =
        Instance::new(&mut store, &loaded.module, &[]).map_err(|e| anyhow!("instance: {e}"))?;

    let memory = instance
        .get_memory(&mut store, "memory")
        .ok_or_else(|| anyhow!("plugin has no memory export"))?;
    let alloc = instance
        .get_typed_func::<i32, i32>(&mut store, "alloc")
        .map_err(|e| anyhow!("alloc not exported: {e}"))?;
    let func = instance
        .get_typed_func::<(i32, i32), i64>(&mut store, &p.function)
        .map_err(|e| anyhow!("function {} not found: {e}", p.function))?;

    let input_bytes = p.input.as_bytes();
    let input_len = input_bytes.len() as i32;
    let input_ptr = alloc
        .call(&mut store, input_len)
        .map_err(|e| anyhow!("alloc call: {e}"))?;
    memory
        .write(&mut store, input_ptr as usize, input_bytes)
        .map_err(|e| anyhow!("write input: {e}"))?;

    let packed = func
        .call(&mut store, (input_ptr, input_len))
        .map_err(|e| anyhow!("function call: {e}"))?;
    let out_ptr = (packed >> 32) as u32 as usize;
    let out_len = (packed & 0xFFFF_FFFF) as u32 as usize;

    if out_len > 16 * 1024 * 1024 {
        return Err(anyhow!("output too large: {out_len} bytes"));
    }

    let mut out_bytes = vec![0u8; out_len];
    memory
        .read(&store, out_ptr, &mut out_bytes)
        .map_err(|e| anyhow!("read output: {e}"))?;
    let out_string = String::from_utf8(out_bytes).map_err(|e| anyhow!("output not utf-8: {e}"))?;

    let fuel_used = 50_000_000 - store.get_fuel().unwrap_or(0);
    Ok(json!({"output": out_string, "fuel_consumed": fuel_used}))
}

async fn op_uninstall(state: Arc<Mutex<State>>, plugin_id: String) -> Result<Value> {
    let mut st = state.lock().await;
    st.plugins.remove(&plugin_id);
    Ok(json!({"uninstalled": true}))
}

async fn dispatch(state: Arc<Mutex<State>>, req: Request) -> Response {
    let id = req.id.unwrap_or(Value::Null);
    let result: Result<Value> = match req.method.as_str() {
        "ping" => Ok(json!({"pong": true})),
        "install" => match serde_json::from_value(req.params) {
            Ok(p) => op_install(state, p).await,
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "invoke" => match serde_json::from_value(req.params) {
            Ok(p) => op_invoke(state, p).await,
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "invoke_string" => match serde_json::from_value(req.params) {
            Ok(p) => op_invoke_string(state, p).await,
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "uninstall" => {
            let plugin_id = req
                .params
                .get("plugin_id")
                .and_then(|v| v.as_str())
                .map(String::from);
            match plugin_id {
                Some(id) => op_uninstall(state, id).await,
                None => return err(id, -32602, "plugin_id required".into()),
            }
        }
        other => return err(id, -32601, format!("method not found: {other}")),
    };
    match result {
        Ok(value) => Response {
            id,
            result: Some(value),
            error: None,
        },
        Err(e) => {
            error!(error = %e, "method failed");
            Response {
                id,
                result: None,
                error: Some(RpcError {
                    code: -32603,
                    message: e.to_string(),
                }),
            }
        }
    }
}

fn err(id: Value, code: i32, message: String) -> Response {
    Response {
        id,
        result: None,
        error: Some(RpcError { code, message }),
    }
}

#[tokio::main(flavor = "multi_thread", worker_threads = 2)]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .json()
        .init();
    info!(
        version = env!("CARGO_PKG_VERSION"),
        "wasmedge_port (wasmtime-backed) starting"
    );

    let state = Arc::new(Mutex::new(State::new()?));
    let stdin = tokio::io::stdin();
    let mut reader = BufReader::new(stdin).lines();
    let mut stdout = tokio::io::stdout();

    while let Some(line) = reader.next_line().await? {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        debug!(bytes = line.len(), "request");
        let resp = match serde_json::from_str::<Request>(line) {
            Ok(req) => dispatch(state.clone(), req).await,
            Err(e) => Response {
                id: Value::Null,
                result: None,
                error: Some(RpcError {
                    code: -32600,
                    message: format!("malformed JSON: {e}"),
                }),
            },
        };
        let mut out = serde_json::to_vec(&resp)?;
        out.push(b'\n');
        if let Err(e) = stdout.write_all(&out).await {
            warn!(error = %e, "stdout write failed; exiting");
            break;
        }
        stdout.flush().await.ok();
    }

    info!("stdin closed; shutting down");
    Ok(())
}
