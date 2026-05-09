#![allow(
    dead_code,
    clippy::redundant_pattern_matching,
    clippy::unwrap_or_default
)]

use anyhow::{anyhow, Context, Result};
use base64::Engine as _;
use loro::{ExportMode, LoroDoc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tracing::{debug, error, info, warn};

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

struct DocStore {
    docs: Mutex<HashMap<String, LoroDoc>>,
}

impl DocStore {
    fn new() -> Self {
        Self {
            docs: Mutex::new(HashMap::new()),
        }
    }

    fn open(&self, doc_id: &str) -> Result<()> {
        let mut docs = self.docs.lock().unwrap();
        docs.entry(doc_id.to_string()).or_insert_with(LoroDoc::new);
        Ok(())
    }

    fn close(&self, doc_id: &str) {
        let mut docs = self.docs.lock().unwrap();
        docs.remove(doc_id);
    }

    fn apply_intent(&self, doc_id: &str, intent: &Intent) -> Result<Vec<u8>> {
        let mut docs = self.docs.lock().unwrap();
        let doc = docs
            .get_mut(doc_id)
            .ok_or_else(|| anyhow!("doc not open: {doc_id}"))?;
        let vv_before = doc.oplog_vv();
        match intent {
            Intent::InsertText {
                container,
                pos,
                text,
            } => {
                let txt = doc.get_text(container.as_str());
                txt.insert(*pos, text)?;
            }
            Intent::DeleteText {
                container,
                pos,
                len,
            } => {
                let txt = doc.get_text(container.as_str());
                txt.delete(*pos, *len)?;
            }
            Intent::SetMap {
                container,
                key,
                value,
            } => {
                let m = doc.get_map(container.as_str());
                m.insert(key, loro::LoroValue::String(value.clone().into()))?;
            }
            Intent::ListPush { container, value } => {
                let l = doc.get_list(container.as_str());
                l.push(loro::LoroValue::String(value.clone().into()))?;
            }
        }
        doc.commit();
        let bytes = doc
            .export(ExportMode::updates(&vv_before))
            .map_err(|e| anyhow!("export failed: {e}"))?;
        Ok(bytes)
    }

    fn apply_remote(&self, doc_id: &str, ops_b64: &[String]) -> Result<usize> {
        let mut docs = self.docs.lock().unwrap();
        let doc = docs
            .get_mut(doc_id)
            .ok_or_else(|| anyhow!("doc not open: {doc_id}"))?;
        let mut applied = 0usize;
        for op_b64 in ops_b64 {
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(op_b64)
                .with_context(|| "invalid base64 op")?;
            doc.import(&bytes)
                .map_err(|e| anyhow!("import failed: {e}"))?;
            applied += 1;
        }
        Ok(applied)
    }

    fn get_state(&self, doc_id: &str) -> Result<Value> {
        let docs = self.docs.lock().unwrap();
        let doc = docs
            .get(doc_id)
            .ok_or_else(|| anyhow!("doc not open: {doc_id}"))?;
        let json = doc.get_deep_value();
        Ok(loro_value_to_json(json))
    }

    fn version_vector(&self, doc_id: &str) -> Result<Value> {
        let docs = self.docs.lock().unwrap();
        let doc = docs
            .get(doc_id)
            .ok_or_else(|| anyhow!("doc not open: {doc_id}"))?;
        let vv = doc.oplog_vv();
        let mut map = serde_json::Map::new();
        for (peer, counter) in vv.iter() {
            map.insert(peer.to_string(), json!(counter));
        }
        Ok(Value::Object(map))
    }

    fn snapshot(&self, doc_id: &str) -> Result<Value> {
        let docs = self.docs.lock().unwrap();
        let doc = docs
            .get(doc_id)
            .ok_or_else(|| anyhow!("doc not open: {doc_id}"))?;
        let snap = doc
            .export(ExportMode::Snapshot)
            .map_err(|e| anyhow!("snapshot export failed: {e}"))?;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&snap);
        Ok(json!({"snap": b64, "size": snap.len()}))
    }

    fn load_snapshot(&self, doc_id: &str, snap_b64: &str) -> Result<Value> {
        let mut docs = self.docs.lock().unwrap();
        let doc = docs.entry(doc_id.to_string()).or_insert_with(LoroDoc::new);
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(snap_b64)
            .context("invalid base64 snapshot")?;
        doc.import(&bytes)
            .map_err(|e| anyhow!("snapshot import failed: {e}"))?;
        Ok(json!({"loaded": true}))
    }
}

fn loro_value_to_json(v: loro::LoroValue) -> Value {
    match v {
        loro::LoroValue::Null => Value::Null,
        loro::LoroValue::Bool(b) => Value::Bool(b),
        loro::LoroValue::Double(d) => json!(d),
        loro::LoroValue::I64(i) => json!(i),
        loro::LoroValue::Binary(b) => {
            let bytes: &[u8] = &b;
            json!(base64::engine::general_purpose::STANDARD.encode(bytes))
        }
        loro::LoroValue::String(s) => Value::String(s.to_string()),
        loro::LoroValue::List(items) => {
            Value::Array(items.iter().cloned().map(loro_value_to_json).collect())
        }
        loro::LoroValue::Map(m) => {
            let mut map = serde_json::Map::new();
            for (k, v) in m.iter() {
                map.insert(k.to_string(), loro_value_to_json(v.clone()));
            }
            Value::Object(map)
        }
        loro::LoroValue::Container(_) => Value::Null,
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum Intent {
    InsertText {
        container: String,
        pos: usize,
        text: String,
    },
    DeleteText {
        container: String,
        pos: usize,
        len: usize,
    },
    SetMap {
        container: String,
        key: String,
        value: String,
    },
    ListPush {
        container: String,
        value: String,
    },
}

#[derive(Debug, Deserialize)]
struct OpenParams {
    doc_id: String,
}

#[derive(Debug, Deserialize)]
struct CloseParams {
    doc_id: String,
}

#[derive(Debug, Deserialize)]
struct ApplyLocalParams {
    doc_id: String,
    intent: Intent,
}

#[derive(Debug, Deserialize)]
struct ApplyRemoteParams {
    doc_id: String,
    ops: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct GetStateParams {
    doc_id: String,
}

#[derive(Debug, Deserialize)]
struct SnapshotParams {
    doc_id: String,
}

#[derive(Debug, Deserialize)]
struct LoadSnapshotParams {
    doc_id: String,
    snap: String,
}

fn dispatch(store: &DocStore, req: Request) -> Response {
    let id = req.id.unwrap_or(Value::Null);
    let result: Result<Value> = match req.method.as_str() {
        "ping" => Ok(json!({"pong": true})),
        "open_doc" => {
            let p: OpenParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return err_resp(id, -32602, e.to_string()),
            };
            store.open(&p.doc_id).map(|_| json!({"opened": true}))
        }
        "close_doc" => {
            let p: CloseParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return err_resp(id, -32602, e.to_string()),
            };
            store.close(&p.doc_id);
            Ok(json!({"closed": true}))
        }
        "apply_local_op" => {
            let p: ApplyLocalParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return err_resp(id, -32602, e.to_string()),
            };
            store.apply_intent(&p.doc_id, &p.intent).map(|bytes| {
                json!({
                    "op": base64::engine::general_purpose::STANDARD.encode(&bytes),
                    "size": bytes.len(),
                })
            })
        }
        "apply_remote_ops" => {
            let p: ApplyRemoteParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return err_resp(id, -32602, e.to_string()),
            };
            store
                .apply_remote(&p.doc_id, &p.ops)
                .map(|n| json!({"applied": n}))
        }
        "get_state" => {
            let p: GetStateParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return err_resp(id, -32602, e.to_string()),
            };
            store.get_state(&p.doc_id)
        }
        "version_vector" => {
            let p: GetStateParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return err_resp(id, -32602, e.to_string()),
            };
            store.version_vector(&p.doc_id)
        }
        "snapshot" => {
            let p: SnapshotParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return err_resp(id, -32602, e.to_string()),
            };
            store.snapshot(&p.doc_id)
        }
        "load_snapshot" => {
            let p: LoadSnapshotParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return err_resp(id, -32602, e.to_string()),
            };
            store.load_snapshot(&p.doc_id, &p.snap)
        }
        other => return err_resp(id, -32601, format!("method not found: {other}")),
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

fn err_resp(id: Value, code: i32, message: String) -> Response {
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
    info!(version = env!("CARGO_PKG_VERSION"), "loro_port starting");

    let store = DocStore::new();
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
            Ok(req) => dispatch(&store, req),
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
