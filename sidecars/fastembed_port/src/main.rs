use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::OnceLock;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::Mutex;
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

#[derive(Deserialize)]
struct EmbedBatchParams {
    texts: Vec<String>,
}

#[derive(Deserialize)]
struct EmbedQueryParams {
    text: String,
}

static MODEL: OnceLock<Mutex<Option<fastembed::TextEmbedding>>> = OnceLock::new();

fn model() -> &'static Mutex<Option<fastembed::TextEmbedding>> {
    MODEL.get_or_init(|| Mutex::new(None))
}

async fn ensure_model() -> Result<()> {
    let mut m = model().lock().await;
    if m.is_some() {
        return Ok(());
    }
    let init_options = fastembed::InitOptions::new(fastembed::EmbeddingModel::AllMiniLML6V2)
        .with_show_download_progress(false);
    let embedding = fastembed::TextEmbedding::try_new(init_options)
        .map_err(|e| anyhow!("model init failed: {e}"))?;
    *m = Some(embedding);
    Ok(())
}

async fn op_load_model() -> Result<Value> {
    ensure_model().await?;
    Ok(json!({"loaded": true, "model": "all-MiniLM-L6-v2", "dimensions": 384}))
}

async fn op_embed_batch(p: EmbedBatchParams) -> Result<Value> {
    ensure_model().await?;
    let m = model().lock().await;
    let embedding = m.as_ref().ok_or_else(|| anyhow!("model not initialized"))?;
    let docs: Vec<&str> = p.texts.iter().map(|s| s.as_str()).collect();
    let vectors = embedding
        .embed(docs, None)
        .map_err(|e| anyhow!("embed failed: {e}"))?;
    Ok(json!({"vectors": vectors}))
}

async fn op_embed_query(p: EmbedQueryParams) -> Result<Value> {
    ensure_model().await?;
    let m = model().lock().await;
    let embedding = m.as_ref().ok_or_else(|| anyhow!("model not initialized"))?;
    let vectors = embedding
        .embed(vec![p.text.as_str()], None)
        .map_err(|e| anyhow!("embed failed: {e}"))?;
    let v = vectors
        .into_iter()
        .next()
        .ok_or_else(|| anyhow!("no vector returned"))?;
    Ok(json!({"vector": v}))
}

fn op_model_info() -> Result<Value> {
    Ok(json!({"model": "all-MiniLM-L6-v2", "dimensions": 384, "quantization": "int8"}))
}

async fn dispatch(req: Request) -> Response {
    let id = req.id.unwrap_or(Value::Null);
    let result: Result<Value> = match req.method.as_str() {
        "ping" => Ok(json!({"pong": true})),
        "load_model" => op_load_model().await,
        "embed_batch" => match serde_json::from_value(req.params) {
            Ok(p) => op_embed_batch(p).await,
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "embed_query" => match serde_json::from_value(req.params) {
            Ok(p) => op_embed_query(p).await,
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "model_info" => op_model_info(),
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

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .json()
        .init();
    info!(
        version = env!("CARGO_PKG_VERSION"),
        "fastembed_port starting"
    );

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
            Ok(req) => dispatch(req).await,
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
