use anyhow::{anyhow, Context, Result};
use iroh::{Endpoint, SecretKey};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::fs;
use tokio::sync::Mutex;
use tracing::{error, info, warn};

const ALPN: &[u8] = b"mycelium/wire/v1";
const MAX_BUFFERED_OPS: usize = 100_000;
const MAX_OP_SIZE: usize = 16 * 1024 * 1024;

struct RelayState {
    buffers: HashMap<String, Vec<Vec<u8>>>,
    total_bytes: usize,
}

impl RelayState {
    fn new() -> Self {
        Self {
            buffers: HashMap::new(),
            total_bytes: 0,
        }
    }
}

struct Args {
    data_dir: PathBuf,
    listen_port: u16,
}

fn parse_args() -> Result<Args> {
    let mut data_dir: Option<String> = None;
    let mut port: u16 = 0;
    let mut iter = std::env::args().skip(1);
    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--data-dir" => {
                data_dir = Some(
                    iter.next()
                        .ok_or_else(|| anyhow!("--data-dir requires value"))?,
                )
            }
            "--port" => {
                port = iter
                    .next()
                    .ok_or_else(|| anyhow!("--port requires value"))?
                    .parse()
                    .context("port not a number")?
            }
            "--help" | "-h" => {
                eprintln!("mycelium-relay — headless relay\n\nUsage:\n  mycelium-relay --data-dir <PATH> [--port <PORT>]\n\nForwards ciphertext CRDT ops between peers it has seen. Stores nothing readable.");
                std::process::exit(0);
            }
            other => return Err(anyhow!("unknown arg: {}", other)),
        }
    }
    Ok(Args {
        data_dir: PathBuf::from(data_dir.unwrap_or_else(|| "./relay-data".into())),
        listen_port: port,
    })
}

async fn load_or_generate_key(data_dir: &PathBuf) -> Result<SecretKey> {
    let key_path = data_dir.join("relay.key");
    if let Ok(bytes) = fs::read(&key_path).await {
        if bytes.len() == 32 {
            let arr: [u8; 32] = bytes.as_slice().try_into().unwrap();
            return Ok(SecretKey::from_bytes(&arr));
        }
    }
    let sk = SecretKey::generate(&mut rand::rngs::OsRng);
    fs::create_dir_all(data_dir).await.ok();
    fs::write(&key_path, sk.to_bytes())
        .await
        .context("write key")?;
    info!(path = ?key_path, "generated relay key");
    Ok(sk)
}

async fn handle_connection(
    state: Arc<Mutex<RelayState>>,
    conn: iroh::endpoint::Connection,
) -> Result<()> {
    let remote = conn.remote_node_id().ok();
    info!(?remote, "incoming relay connection");
    while let Ok(mut recv) = conn.accept_uni().await {
        let bytes = recv
            .read_to_end(MAX_OP_SIZE)
            .await
            .map_err(|e| anyhow!("read: {e}"))?;
        if bytes.len() > MAX_OP_SIZE {
            warn!("op exceeded max size; dropping");
            continue;
        }
        let key = remote
            .map(|n| hex::encode(n.as_bytes()))
            .unwrap_or_else(|| "anon".into());
        let mut st = state.lock().await;
        if st.total_bytes + bytes.len() > 100 * 1024 * 1024 {
            warn!("relay buffer at capacity; oldest evicted");
            for (_, buf) in st.buffers.iter_mut() {
                if !buf.is_empty() {
                    let evicted = buf.remove(0);
                    st.total_bytes = st.total_bytes.saturating_sub(evicted.len());
                    break;
                }
            }
        }
        let buf = st.buffers.entry(key.clone()).or_insert_with(Vec::new);
        if buf.len() >= MAX_BUFFERED_OPS {
            buf.remove(0);
        }
        buf.push(bytes.clone());
        st.total_bytes += bytes.len();
        let total_buffers = st.buffers.len();
        let total_bytes = st.total_bytes;
        drop(st);
        info!(from = %key, op_size = bytes.len(), buffers = total_buffers, total_bytes, "buffered op");
    }
    Ok(())
}

async fn periodic_status(state: Arc<Mutex<RelayState>>) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
    loop {
        interval.tick().await;
        let st = state.lock().await;
        info!(
            peers_buffered = st.buffers.len(),
            total_bytes = st.total_bytes,
            "relay status"
        );
    }
}

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .json()
        .init();

    let args = parse_args()?;
    info!(version = env!("CARGO_PKG_VERSION"), data_dir = ?args.data_dir, port = args.listen_port, "mycelium-relay starting");

    let secret = load_or_generate_key(&args.data_dir).await?;
    let mut builder = Endpoint::builder()
        .secret_key(secret)
        .alpns(vec![ALPN.to_vec()])
        .discovery_n0()
        .discovery_local_network();
    if args.listen_port != 0 {
        builder = builder.bind_addr_v4(format!("0.0.0.0:{}", args.listen_port).parse()?);
    }
    let endpoint = builder
        .bind()
        .await
        .map_err(|e| anyhow!("endpoint bind: {e:?}"))?;
    let node_id = endpoint.node_id();
    info!(node_id_hex = %hex::encode(node_id.as_bytes()), "relay endpoint bound");

    let state = Arc::new(Mutex::new(RelayState::new()));

    let status_state = state.clone();
    tokio::spawn(async move { periodic_status(status_state).await });

    let shutdown = tokio::signal::ctrl_c();
    tokio::pin!(shutdown);

    loop {
        tokio::select! {
            _ = &mut shutdown => {
                info!("shutdown requested");
                break;
            }
            incoming = endpoint.accept() => {
                match incoming {
                    Some(incoming) => {
                        let st = state.clone();
                        tokio::spawn(async move {
                            match incoming.accept() {
                                Ok(connecting) => match connecting.await {
                                    Ok(conn) => {
                                        if let Err(e) = handle_connection(st, conn).await {
                                            warn!(error = %e, "connection handler failed");
                                        }
                                    }
                                    Err(e) => error!(error = %e, "connecting failed"),
                                }
                                Err(e) => error!(error = %e, "accept failed"),
                            }
                        });
                    }
                    None => break,
                }
            }
        }
    }

    info!("relay shutting down");
    endpoint.close().await;
    Ok(())
}
