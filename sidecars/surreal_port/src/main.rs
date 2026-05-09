//! Mycelium SurrealDB embedded sidecar.
//!
//! Speaks line-framed JSON-RPC over stdio (the port protocol — see
//! `docs/protocols/port.md` and `proto/port.cddl`). Owns the embedded
//! SurrealDB database file at the path given by `--db-path`.
//!
//! Methods exposed in M0:
//! - `ping`         heartbeat
//! - `migrate`      run schema definitions idempotently
//! - `create_node`  insert a node, return the stored record
//! - `get_node`     fetch a single node by id
//! - `list_nodes`   list nodes ordered by `updated_at DESC`
//! - `update_node`  patch title/body, server bumps `updated_at`
//! - `delete_node`  hard delete (CRDT tombstoning is M1)
//!
//! Logs go to stderr so they do not pollute the stdout port channel.
//! Exits cleanly on stdin EOF (the BEAM port closing).

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use surrealdb::engine::local::{Db, RocksDb};
use surrealdb::Surreal;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tracing::{debug, error, info, warn};

// ---------- CLI ----------

#[derive(Debug)]
struct Args {
    db_path: String,
    log_level: String,
}

fn parse_args() -> Result<Args> {
    let mut db_path: Option<String> = None;
    let mut log_level = "info".to_string();
    let mut iter = std::env::args().skip(1);
    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--db-path" => {
                db_path = Some(
                    iter.next()
                        .ok_or_else(|| anyhow!("--db-path requires a value"))?,
                );
            }
            "--log-level" => {
                log_level = iter
                    .next()
                    .ok_or_else(|| anyhow!("--log-level requires a value"))?;
            }
            "--help" | "-h" => {
                eprintln!(
                    "surreal_port — Mycelium SurrealDB sidecar\n\
                     \n\
                     USAGE:\n  \
                       surreal_port --db-path <PATH> [--log-level <LEVEL>]\n\
                     \n\
                     Speaks line-framed JSON-RPC on stdin/stdout.\n\
                     See docs/protocols/port.md."
                );
                std::process::exit(0);
            }
            other => return Err(anyhow!("unknown argument: {}", other)),
        }
    }
    Ok(Args {
        db_path: db_path.ok_or_else(|| anyhow!("--db-path is required"))?,
        log_level,
    })
}

// ---------- JSON-RPC envelopes ----------

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

impl RpcError {
    fn invalid_request(msg: impl Into<String>) -> Self {
        Self {
            code: -32600,
            message: msg.into(),
        }
    }
    fn method_not_found(method: &str) -> Self {
        Self {
            code: -32601,
            message: format!("method not found: {method}"),
        }
    }
    fn invalid_params(msg: impl Into<String>) -> Self {
        Self {
            code: -32602,
            message: msg.into(),
        }
    }
    fn internal(msg: impl Into<String>) -> Self {
        Self {
            code: -32603,
            message: msg.into(),
        }
    }
}

// ---------- Methods ----------

#[derive(Debug, Deserialize)]
struct CreateNodeParams {
    id: String,
    kind: String,
    #[serde(default)]
    title: String,
    #[serde(default)]
    body: Vec<Value>,
}

#[derive(Debug, Deserialize)]
struct GetNodeParams {
    id: String,
}

#[derive(Debug, Deserialize, Default)]
struct ListNodesParams {
    #[serde(default = "default_limit")]
    limit: u32,
    #[serde(default)]
    offset: u32,
}
fn default_limit() -> u32 {
    100
}

#[derive(Debug, Deserialize)]
struct UpdateNodeParams {
    id: String,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    body: Option<Vec<Value>>,
}

#[derive(Debug, Deserialize)]
struct DeleteNodeParams {
    id: String,
}

// ---------- Storage layer ----------

struct Storage {
    db: Surreal<Db>,
}

impl Storage {
    async fn open(path: &str) -> Result<Self> {
        info!(db_path = %path, "opening SurrealDB at path");
        // TODO M2: wrap path with age decryption for at-rest encryption (FR-CRYPTO-07).
        let db = Surreal::new::<RocksDb>(path)
            .await
            .with_context(|| format!("failed to open SurrealDB at {path}"))?;
        db.use_ns("mycelium").use_db("local").await?;
        Ok(Self { db })
    }

    async fn migrate(&self) -> Result<Value> {
        let stmts = r#"
            DEFINE TABLE node SCHEMAFULL;
            DEFINE FIELD id          ON node TYPE string;
            DEFINE FIELD kind        ON node TYPE string ASSERT $value INSIDE ["note"];
            DEFINE FIELD title       ON node TYPE string DEFAULT "";
            DEFINE FIELD body        ON node FLEXIBLE TYPE array DEFAULT [];
            DEFINE FIELD created_at  ON node TYPE int DEFAULT 0;
            DEFINE FIELD updated_at  ON node TYPE int DEFAULT 0;
            DEFINE FIELD schema_ver  ON node TYPE int DEFAULT 1;
            DEFINE INDEX node_updated ON TABLE node FIELDS updated_at;

            DEFINE TABLE block_embedding SCHEMAFULL;
            DEFINE FIELD block_id   ON block_embedding TYPE string;
            DEFINE FIELD node_id    ON block_embedding TYPE string;
            DEFINE FIELD vector     ON block_embedding TYPE array<float>;
            DEFINE FIELD model_id   ON block_embedding TYPE string DEFAULT "all-MiniLM-L6-v2";
            DEFINE FIELD updated_at ON block_embedding TYPE int DEFAULT 0;
            DEFINE INDEX emb_block ON TABLE block_embedding FIELDS block_id UNIQUE;
            DEFINE INDEX emb_node  ON TABLE block_embedding FIELDS node_id;

            DEFINE TABLE op_log SCHEMAFULL;
            DEFINE FIELD doc_id     ON op_log TYPE string;
            DEFINE FIELD lamport    ON op_log TYPE int;
            DEFINE FIELD author     ON op_log TYPE string;
            DEFINE FIELD dek_id     ON op_log TYPE int DEFAULT 1;
            DEFINE FIELD ciphertext ON op_log TYPE string;
            DEFINE FIELD created_at ON op_log TYPE int DEFAULT 0;
            DEFINE INDEX op_log_doc ON TABLE op_log FIELDS doc_id, lamport;

            DEFINE TABLE meta SCHEMAFULL;
            DEFINE FIELD key   ON meta TYPE string;
            DEFINE FIELD value ON meta FLEXIBLE TYPE any;
            DEFINE INDEX meta_key ON TABLE meta FIELDS key UNIQUE;
        "#;
        self.db.query(stmts).await?;
        Ok(json!({"applied": true, "schema_version": 2}))
    }

    fn now_ms() -> i64 {
        use std::time::{SystemTime, UNIX_EPOCH};
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0)
    }

    async fn create_node(&self, p: CreateNodeParams) -> Result<Value> {
        if p.kind != "note" {
            return Err(anyhow!("kind '{}' not supported in M0 (note only)", p.kind));
        }
        let now = Self::now_ms();
        let sql = r#"
            CREATE type::thing("node", $id) CONTENT {
                id: $id,
                kind: $kind,
                title: $title,
                body: $body,
                created_at: $now,
                updated_at: $now,
                schema_ver: 1
            };
        "#;
        self.db
            .query(sql)
            .bind(("id", p.id.clone()))
            .bind(("kind", p.kind))
            .bind(("title", p.title))
            .bind(("body", p.body))
            .bind(("now", now))
            .await?;
        Ok(json!({"id": p.id, "created": true}))
    }

    async fn get_node(&self, p: GetNodeParams) -> Result<Value> {
        let sql = r#"
            SELECT
                meta::id(id) AS id,
                kind, title, body, created_at, updated_at, schema_ver
            FROM type::thing("node", $id);
        "#;
        let mut res = self.db.query(sql).bind(("id", p.id)).await?;
        let nodes: Vec<Value> = res.take(0)?;
        Ok(nodes.into_iter().next().unwrap_or(Value::Null))
    }

    async fn list_nodes(&self, p: ListNodesParams) -> Result<Value> {
        let sql = r#"
            SELECT
                meta::id(id) AS id,
                kind, title, body, created_at, updated_at, schema_ver
            FROM node ORDER BY updated_at DESC LIMIT $limit START $offset;
        "#;
        let mut res = self
            .db
            .query(sql)
            .bind(("limit", p.limit))
            .bind(("offset", p.offset))
            .await?;
        let nodes: Vec<Value> = res.take(0)?;
        Ok(json!({"items": nodes, "limit": p.limit, "offset": p.offset}))
    }

    async fn update_node(&self, p: UpdateNodeParams) -> Result<Value> {
        let now = Self::now_ms();
        let sql = r#"
            UPDATE type::thing("node", $id) MERGE {
                title: $title,
                body: $body,
                updated_at: $now
            };
        "#;
        let mut q = self.db.query(sql).bind(("id", p.id.clone()));
        q = q.bind(("title", p.title.unwrap_or_default()));
        q = q.bind(("body", p.body.unwrap_or_default()));
        q = q.bind(("now", now));
        q.await?;
        Ok(json!({"id": p.id, "updated": true}))
    }

    async fn delete_node(&self, p: DeleteNodeParams) -> Result<Value> {
        let sql = "DELETE type::thing(\"node\", $id);";
        self.db.query(sql).bind(("id", p.id.clone())).await?;
        Ok(json!({"deleted": p.id}))
    }

    async fn search_nodes(&self, p: SearchParams) -> Result<Value> {
        let sql = r#"
            SELECT
                meta::id(id) AS id,
                kind, title, body, created_at, updated_at, schema_ver
            FROM node
            WHERE string::lowercase(title) CONTAINS string::lowercase($q)
            ORDER BY updated_at DESC LIMIT $limit;
        "#;
        let mut res = self
            .db
            .query(sql)
            .bind(("q", p.query))
            .bind(("limit", p.limit))
            .await?;
        let nodes: Vec<Value> = res.take(0)?;
        Ok(json!({"items": nodes}))
    }

    async fn upsert_embedding(&self, p: UpsertEmbeddingParams) -> Result<Value> {
        let now = Self::now_ms();
        let sql = r#"
            DELETE FROM block_embedding WHERE block_id = $block_id;
            CREATE block_embedding CONTENT {
                block_id: $block_id,
                node_id: $node_id,
                vector: $vector,
                model_id: $model_id,
                updated_at: $now
            };
        "#;
        self.db
            .query(sql)
            .bind(("block_id", p.block_id))
            .bind(("node_id", p.node_id))
            .bind(("vector", p.vector))
            .bind((
                "model_id",
                p.model_id.unwrap_or_else(|| "all-MiniLM-L6-v2".into()),
            ))
            .bind(("now", now))
            .await?;
        Ok(json!({"upserted": true}))
    }

    async fn semantic_search(&self, p: SemanticSearchParams) -> Result<Value> {
        let sql = r#"
            SELECT
                block_id,
                node_id,
                vector::similarity::cosine(vector, $q) AS score
            FROM block_embedding
            ORDER BY score DESC
            LIMIT $limit;
        "#;
        let mut res = self
            .db
            .query(sql)
            .bind(("q", p.query_vector))
            .bind(("limit", p.limit))
            .await?;
        let rows: Vec<Value> = res.take(0)?;
        Ok(json!({"items": rows}))
    }

    async fn hybrid_search(&self, p: HybridSearchParams) -> Result<Value> {
        let now = Self::now_ms();
        let recency_window: i64 = 1000 * 60 * 60 * 24 * 30;
        let sql = r#"
            LET $sem = (
                SELECT
                    block_id,
                    node_id,
                    vector::similarity::cosine(vector, $q) AS sem_score
                FROM block_embedding
                ORDER BY sem_score DESC
                LIMIT $candidate_count
            );
            LET $lex = (
                SELECT
                    meta::id(id) AS id,
                    title, updated_at,
                    (IF string::lowercase(title) CONTAINS string::lowercase($q_text) THEN 1.0 ELSE 0.0 END) AS lex_score
                FROM node
                WHERE string::lowercase(title) CONTAINS string::lowercase($q_text)
                LIMIT $candidate_count
            );
            SELECT
                meta::id(id) AS id, kind, title, body, created_at, updated_at, schema_ver
            FROM node
            WHERE meta::id(id) IN $lex.id OR meta::id(id) IN $sem.node_id
            LIMIT $limit;
        "#;
        let mut res = self
            .db
            .query(sql)
            .bind(("q", p.query_vector))
            .bind(("q_text", p.query_text))
            .bind(("candidate_count", p.limit * 4))
            .bind(("limit", p.limit))
            .await?;
        let nodes: Vec<Value> = res.take(2)?;
        let scored: Vec<Value> = nodes
            .into_iter()
            .map(|n| {
                let updated_at = n.get("updated_at").and_then(|v| v.as_i64()).unwrap_or(0);
                let recency_score = if recency_window > 0 {
                    let age = (now - updated_at).max(0) as f64;
                    (1.0_f64 - (age / recency_window as f64).min(1.0)).max(0.0)
                } else {
                    0.0
                };
                let mut o = n.as_object().cloned().unwrap_or_default();
                o.insert("recency_score".into(), json!(recency_score));
                Value::Object(o)
            })
            .collect();
        Ok(json!({"items": scored, "weights": {"semantic": 0.7, "recency": 0.2, "lexical": 0.1}}))
    }

    async fn append_op(&self, p: AppendOpParams) -> Result<Value> {
        let now = Self::now_ms();
        let sql = r#"
            CREATE op_log CONTENT {
                doc_id: $doc_id,
                lamport: $lamport,
                author: $author,
                dek_id: $dek_id,
                ciphertext: $ciphertext,
                created_at: $now
            };
        "#;
        self.db
            .query(sql)
            .bind(("doc_id", p.doc_id))
            .bind(("lamport", p.lamport))
            .bind(("author", p.author))
            .bind(("dek_id", p.dek_id))
            .bind(("ciphertext", p.ciphertext_b64))
            .bind(("now", now))
            .await?;
        Ok(json!({"appended": true}))
    }

    async fn list_ops(&self, p: ListOpsParams) -> Result<Value> {
        let sql = r#"
            SELECT doc_id, lamport, author, dek_id, ciphertext, created_at
            FROM op_log
            WHERE doc_id = $doc_id AND lamport >= $from
            ORDER BY lamport ASC LIMIT $limit;
        "#;
        let mut res = self
            .db
            .query(sql)
            .bind(("doc_id", p.doc_id))
            .bind(("from", p.from))
            .bind(("limit", p.limit))
            .await?;
        let ops: Vec<Value> = res.take(0)?;
        Ok(json!({"items": ops}))
    }

    async fn compact_log(&self, p: CompactLogParams) -> Result<Value> {
        let sql = r#"
            DELETE FROM op_log WHERE doc_id = $doc_id AND lamport <= $upto;
        "#;
        self.db
            .query(sql)
            .bind(("doc_id", p.doc_id))
            .bind(("upto", p.upto))
            .await?;
        Ok(json!({"compacted": true, "upto": p.upto}))
    }

    async fn meta_set(&self, p: MetaParams) -> Result<Value> {
        let sql = r#"
            DELETE FROM meta WHERE key = $key;
            CREATE meta CONTENT { key: $key, value: $value };
        "#;
        self.db
            .query(sql)
            .bind(("key", p.key))
            .bind(("value", p.value.unwrap_or(Value::Null)))
            .await?;
        Ok(json!({"stored": true}))
    }

    async fn meta_get(&self, p: MetaGetParams) -> Result<Value> {
        let sql = "SELECT value FROM meta WHERE key = $key LIMIT 1;";
        let mut res = self.db.query(sql).bind(("key", p.key)).await?;
        let rows: Vec<Value> = res.take(0)?;
        match rows.into_iter().next() {
            Some(row) => Ok(json!({"value": row.get("value").cloned().unwrap_or(Value::Null)})),
            None => Ok(json!({"value": null})),
        }
    }
}

#[derive(Debug, Deserialize)]
struct UpsertEmbeddingParams {
    block_id: String,
    node_id: String,
    vector: Vec<f32>,
    #[serde(default)]
    model_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SemanticSearchParams {
    query_vector: Vec<f32>,
    #[serde(default = "default_limit")]
    limit: u32,
}

#[derive(Debug, Deserialize)]
struct HybridSearchParams {
    query_vector: Vec<f32>,
    query_text: String,
    #[serde(default = "default_limit")]
    limit: u32,
}

#[derive(Debug, Deserialize)]
struct AppendOpParams {
    doc_id: String,
    lamport: i64,
    author: String,
    #[serde(default = "default_dek_id")]
    dek_id: i64,
    ciphertext_b64: String,
}
fn default_dek_id() -> i64 {
    1
}

#[derive(Debug, Deserialize)]
struct ListOpsParams {
    doc_id: String,
    #[serde(default)]
    from: i64,
    #[serde(default = "default_limit")]
    limit: u32,
}

#[derive(Debug, Deserialize)]
struct CompactLogParams {
    doc_id: String,
    upto: i64,
}

#[derive(Debug, Deserialize)]
struct MetaParams {
    key: String,
    #[serde(default)]
    value: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct MetaGetParams {
    key: String,
}

#[derive(Debug, Deserialize)]
struct SearchParams {
    query: String,
    #[serde(default = "default_limit")]
    limit: u32,
}

// ---------- Dispatch ----------

async fn dispatch(storage: &Arc<Storage>, req: Request) -> Response {
    let id = req.id.unwrap_or(Value::Null);
    let result = match req.method.as_str() {
        "ping" => Ok(json!({"pong": true})),
        "migrate" => storage.migrate().await,
        "create_node" => match serde_json::from_value::<CreateNodeParams>(req.params) {
            Ok(p) => storage.create_node(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "get_node" => match serde_json::from_value::<GetNodeParams>(req.params) {
            Ok(p) => storage.get_node(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "list_nodes" => match serde_json::from_value::<ListNodesParams>(req.params) {
            Ok(p) => storage.list_nodes(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "update_node" => match serde_json::from_value::<UpdateNodeParams>(req.params) {
            Ok(p) => storage.update_node(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "search_nodes" => match serde_json::from_value::<SearchParams>(req.params) {
            Ok(p) => storage.search_nodes(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "upsert_embedding" => match serde_json::from_value::<UpsertEmbeddingParams>(req.params) {
            Ok(p) => storage.upsert_embedding(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "semantic_search" => match serde_json::from_value::<SemanticSearchParams>(req.params) {
            Ok(p) => storage.semantic_search(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "hybrid_search" => match serde_json::from_value::<HybridSearchParams>(req.params) {
            Ok(p) => storage.hybrid_search(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "append_op" => match serde_json::from_value::<AppendOpParams>(req.params) {
            Ok(p) => storage.append_op(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "list_ops" => match serde_json::from_value::<ListOpsParams>(req.params) {
            Ok(p) => storage.list_ops(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "compact_log" => match serde_json::from_value::<CompactLogParams>(req.params) {
            Ok(p) => storage.compact_log(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "meta_set" => match serde_json::from_value::<MetaParams>(req.params) {
            Ok(p) => storage.meta_set(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "meta_get" => match serde_json::from_value::<MetaGetParams>(req.params) {
            Ok(p) => storage.meta_get(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        "delete_node" => match serde_json::from_value::<DeleteNodeParams>(req.params) {
            Ok(p) => storage.delete_node(p).await,
            Err(e) => return error_response(id, RpcError::invalid_params(e.to_string())),
        },
        other => return error_response(id, RpcError::method_not_found(other)),
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
                error: Some(RpcError::internal(e.to_string())),
            }
        }
    }
}

fn error_response(id: Value, err: RpcError) -> Response {
    Response {
        id,
        result: None,
        error: Some(err),
    }
}

// ---------- Main loop ----------

#[tokio::main(flavor = "multi_thread", worker_threads = 2)]
async fn main() -> Result<()> {
    let args = parse_args()?;

    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(&args.log_level)),
        )
        .json()
        .init();

    info!(version = env!("CARGO_PKG_VERSION"), "surreal_port starting");

    let storage = Arc::new(Storage::open(&args.db_path).await?);
    info!("storage opened, entering port loop");

    let stdin = tokio::io::stdin();
    let mut reader = BufReader::new(stdin).lines();
    let mut stdout = tokio::io::stdout();

    while let Some(line) = reader.next_line().await? {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        debug!(bytes = line.len(), "request");
        let response = match serde_json::from_str::<Request>(line) {
            Ok(req) => dispatch(&storage, req).await,
            Err(e) => Response {
                id: Value::Null,
                result: None,
                error: Some(RpcError::invalid_request(format!("malformed JSON: {e}"))),
            },
        };
        let mut out = serde_json::to_vec(&response)?;
        out.push(b'\n');
        if let Err(e) = stdout.write_all(&out).await {
            warn!(error = %e, "stdout write failed; exiting");
            break;
        }
        stdout.flush().await.ok();
    }

    info!("stdin closed; shutting down cleanly");
    Ok(())
}
