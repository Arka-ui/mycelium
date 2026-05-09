#![allow(
    dead_code,
    unused_imports,
    clippy::redundant_pattern_matching,
    clippy::unwrap_or_default
)]

use anyhow::{anyhow, Context, Result};
use base64::Engine as _;
use futures_lite::stream::StreamExt;
use iroh::{Endpoint, NodeAddr, NodeId, SecretKey};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};

const ALPN: &[u8] = b"mycelium/wire/v1";

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
struct BindParams {
    secret_b64: String,
}

#[derive(Deserialize)]
struct ConnectParams {
    node_id_hex: String,
    payload_b64: String,
}

struct State {
    endpoint: Option<Endpoint>,
    peers: HashMap<String, NodeAddr>,
}

impl State {
    fn new() -> Self {
        Self {
            endpoint: None,
            peers: HashMap::new(),
        }
    }
}

async fn op_bind(state: Arc<Mutex<State>>, p: BindParams) -> Result<Value> {
    let mut st = state.lock().await;
    if st.endpoint.is_some() {
        return Ok(json!({"already_bound": true}));
    }
    let secret_bytes = base64::engine::general_purpose::STANDARD
        .decode(&p.secret_b64)
        .context("invalid base64 secret")?;
    let arr: [u8; 32] = secret_bytes
        .as_slice()
        .try_into()
        .map_err(|_| anyhow!("secret must be 32 bytes"))?;
    let secret = SecretKey::from_bytes(&arr);
    let endpoint = Endpoint::builder()
        .secret_key(secret)
        .alpns(vec![ALPN.to_vec()])
        .discovery_n0()
        .discovery_local_network()
        .bind()
        .await
        .map_err(|e| anyhow!("endpoint bind: {e:?}"))?;
    let node_id = endpoint.node_id();
    st.endpoint = Some(endpoint);
    Ok(json!({"node_id_hex": hex::encode(node_id.as_bytes())}))
}

async fn op_node_id(state: Arc<Mutex<State>>) -> Result<Value> {
    let st = state.lock().await;
    let ep = st.endpoint.as_ref().ok_or_else(|| anyhow!("not bound"))?;
    Ok(json!({"node_id_hex": hex::encode(ep.node_id().as_bytes())}))
}

async fn op_connect_send(state: Arc<Mutex<State>>, p: ConnectParams) -> Result<Value> {
    let endpoint = {
        let st = state.lock().await;
        st.endpoint.clone().ok_or_else(|| anyhow!("not bound"))?
    };
    let id_bytes = hex::decode(&p.node_id_hex).context("invalid hex node id")?;
    let arr: [u8; 32] = id_bytes
        .as_slice()
        .try_into()
        .map_err(|_| anyhow!("node id must be 32 bytes"))?;
    let node_id = NodeId::from_bytes(&arr).map_err(|e| anyhow!("node id parse: {e}"))?;
    let payload = base64::engine::general_purpose::STANDARD
        .decode(&p.payload_b64)
        .context("invalid base64 payload")?;
    let conn = endpoint
        .connect(NodeAddr::new(node_id), ALPN)
        .await
        .map_err(|e| anyhow!("connect: {e:?}"))?;
    let mut send = conn
        .open_uni()
        .await
        .map_err(|e| anyhow!("open_uni: {e:?}"))?;
    send.write_all(&payload)
        .await
        .map_err(|e| anyhow!("write: {e:?}"))?;
    send.finish().map_err(|e| anyhow!("finish: {e:?}"))?;
    Ok(json!({"sent": payload.len()}))
}

async fn dispatch(state: Arc<Mutex<State>>, req: Request) -> Response {
    let id = req.id.unwrap_or(Value::Null);
    let result: Result<Value> = match req.method.as_str() {
        "ping" => Ok(json!({"pong": true})),
        "bind" => match serde_json::from_value(req.params) {
            Ok(p) => op_bind(state, p).await,
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "node_id" => op_node_id(state).await,
        "connect_send" => match serde_json::from_value(req.params) {
            Ok(p) => op_connect_send(state, p).await,
            Err(e) => return err(id, -32602, e.to_string()),
        },
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

async fn accept_loop(state: Arc<Mutex<State>>) {
    loop {
        let endpoint = {
            let st = state.lock().await;
            match st.endpoint.clone() {
                Some(e) => e,
                None => {
                    drop(st);
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    continue;
                }
            }
        };
        match endpoint.accept().await {
            Some(incoming) => {
                tokio::spawn(async move {
                    match incoming.accept() {
                        Ok(connecting) => match connecting.await {
                            Ok(conn) => {
                                let remote = conn.remote_node_id().ok();
                                info!(?remote, "incoming connection");
                                while let Ok(mut recv) = conn.accept_uni().await {
                                    let mut buf = Vec::new();
                                    if let Ok(_) = recv.read_to_end(usize::MAX).await.map(|b| {
                                        buf = b;
                                    }) {
                                        let payload_b64 =
                                            base64::engine::general_purpose::STANDARD.encode(&buf);
                                        let notif = json!({
                                            "method": "incoming",
                                            "params": {
                                                "from_hex": remote.map(|r| hex::encode(r.as_bytes())),
                                                "payload_b64": payload_b64,
                                            }
                                        });
                                        let mut line =
                                            serde_json::to_vec(&notif).unwrap_or_default();
                                        line.push(b'\n');
                                        let mut out = tokio::io::stdout();
                                        let _ = out.write_all(&line).await;
                                        let _ = out.flush().await;
                                    }
                                }
                            }
                            Err(e) => warn!(error = %e, "connecting failed"),
                        },
                        Err(e) => warn!(error = %e, "accept incoming failed"),
                    }
                });
            }
            None => {
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        }
    }
}

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .json()
        .init();
    info!(version = env!("CARGO_PKG_VERSION"), "iroh_port starting");

    let state = Arc::new(Mutex::new(State::new()));
    let accept_state = state.clone();
    tokio::spawn(async move { accept_loop(accept_state).await });

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
