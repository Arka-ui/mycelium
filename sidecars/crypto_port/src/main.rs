use age::secrecy::ExposeSecret;
use anyhow::{anyhow, Context, Result};
use base64::Engine as _;
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{Read, Write};
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

#[derive(Deserialize)]
struct HashParams {
    data_b64: String,
}

#[derive(Deserialize)]
struct SignParams {
    secret_b64: String,
    message_b64: String,
}

#[derive(Deserialize)]
struct VerifyParams {
    public_b64: String,
    signature_b64: String,
    message_b64: String,
}

#[derive(Deserialize)]
struct AgeEncryptParams {
    plaintext_b64: String,
    recipients_b64: Vec<String>,
}

#[derive(Deserialize)]
struct AgeDecryptParams {
    ciphertext_b64: String,
    identity_b64: String,
}

#[derive(Deserialize)]
struct KeyringParams {
    service: String,
    account: String,
    secret_b64: Option<String>,
}

#[derive(Deserialize)]
struct Spake2StartParams {
    passphrase: String,
    our_id: String,
    their_id: String,
    role: String,
}

#[derive(Deserialize)]
struct Spake2FinishParams {
    session_id: String,
    peer_msg_b64: String,
}

fn b64_dec(s: &str) -> Result<Vec<u8>> {
    base64::engine::general_purpose::STANDARD
        .decode(s)
        .context("invalid base64")
}

fn b64_enc(b: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(b)
}

fn op_blake3(p: HashParams) -> Result<Value> {
    let bytes = b64_dec(&p.data_b64)?;
    let h = blake3::hash(&bytes);
    Ok(json!({"hash_hex": h.to_hex().to_string(), "hash_b64": b64_enc(h.as_bytes())}))
}

fn op_ed25519_generate() -> Result<Value> {
    let sk = SigningKey::generate(&mut rand::rngs::OsRng);
    let vk = sk.verifying_key();
    Ok(json!({
        "secret_b64": b64_enc(&sk.to_bytes()),
        "public_b64": b64_enc(vk.as_bytes()),
    }))
}

fn op_ed25519_sign(p: SignParams) -> Result<Value> {
    let secret = b64_dec(&p.secret_b64)?;
    let msg = b64_dec(&p.message_b64)?;
    let sk_bytes: [u8; 32] = secret
        .as_slice()
        .try_into()
        .map_err(|_| anyhow!("secret must be 32 bytes"))?;
    let sk = SigningKey::from_bytes(&sk_bytes);
    let sig = sk.sign(&msg);
    Ok(json!({"signature_b64": b64_enc(&sig.to_bytes())}))
}

fn op_ed25519_verify(p: VerifyParams) -> Result<Value> {
    let pub_bytes = b64_dec(&p.public_b64)?;
    let sig_bytes = b64_dec(&p.signature_b64)?;
    let msg = b64_dec(&p.message_b64)?;
    let pub_arr: [u8; 32] = pub_bytes
        .as_slice()
        .try_into()
        .map_err(|_| anyhow!("public key must be 32 bytes"))?;
    let sig_arr: [u8; 64] = sig_bytes
        .as_slice()
        .try_into()
        .map_err(|_| anyhow!("signature must be 64 bytes"))?;
    let vk = VerifyingKey::from_bytes(&pub_arr)?;
    let sig = Signature::from_bytes(&sig_arr);
    Ok(json!({"valid": vk.verify(&msg, &sig).is_ok()}))
}

fn op_age_generate_identity() -> Result<Value> {
    let identity = age::x25519::Identity::generate();
    let recipient = identity.to_public();
    Ok(json!({
        "identity_str": identity.to_string().expose_secret().to_string(),
        "recipient_str": recipient.to_string(),
    }))
}

fn op_age_encrypt(p: AgeEncryptParams) -> Result<Value> {
    let plaintext = b64_dec(&p.plaintext_b64)?;
    let mut parsed: Vec<age::x25519::Recipient> = Vec::new();
    for r_b64 in &p.recipients_b64 {
        let r_bytes = b64_dec(r_b64)?;
        let r_str = String::from_utf8(r_bytes).context("recipient not utf-8")?;
        let r: age::x25519::Recipient = r_str
            .parse()
            .map_err(|e| anyhow!("recipient parse: {e:?}"))?;
        parsed.push(r);
    }
    let recipient_refs: Vec<&dyn age::Recipient> =
        parsed.iter().map(|r| r as &dyn age::Recipient).collect();
    let encryptor = age::Encryptor::with_recipients(recipient_refs.into_iter())
        .map_err(|e| anyhow!("encryptor: {e:?}"))?;
    let mut output = Vec::new();
    let mut writer = encryptor
        .wrap_output(&mut output)
        .map_err(|e| anyhow!("wrap: {e:?}"))?;
    writer.write_all(&plaintext)?;
    writer.finish().map_err(|e| anyhow!("finish: {e:?}"))?;
    Ok(json!({"ciphertext_b64": b64_enc(&output)}))
}

fn op_age_decrypt(p: AgeDecryptParams) -> Result<Value> {
    let ct = b64_dec(&p.ciphertext_b64)?;
    let id_bytes = b64_dec(&p.identity_b64)?;
    let id_str = String::from_utf8(id_bytes).context("identity not utf-8")?;
    let identity: age::x25519::Identity = id_str
        .parse()
        .map_err(|e| anyhow!("identity parse: {e:?}"))?;
    let decryptor = age::Decryptor::new(&ct[..]).map_err(|e| anyhow!("decryptor: {e:?}"))?;
    let mut reader = decryptor
        .decrypt(std::iter::once(&identity as &dyn age::Identity))
        .map_err(|e| anyhow!("decrypt: {e:?}"))?;
    let mut plaintext = Vec::new();
    reader.read_to_end(&mut plaintext)?;
    Ok(json!({"plaintext_b64": b64_enc(&plaintext)}))
}

fn op_keyring_set(p: KeyringParams) -> Result<Value> {
    let entry =
        keyring::Entry::new(&p.service, &p.account).map_err(|e| anyhow!("keyring entry: {e}"))?;
    let bytes = b64_dec(
        p.secret_b64
            .as_deref()
            .ok_or_else(|| anyhow!("secret_b64 required"))?,
    )?;
    entry
        .set_secret(&bytes)
        .map_err(|e| anyhow!("keyring set: {e}"))?;
    Ok(json!({"stored": true}))
}

fn op_keyring_get(p: KeyringParams) -> Result<Value> {
    let entry =
        keyring::Entry::new(&p.service, &p.account).map_err(|e| anyhow!("keyring entry: {e}"))?;
    match entry.get_secret() {
        Ok(bytes) => Ok(json!({"secret_b64": b64_enc(&bytes)})),
        Err(keyring::Error::NoEntry) => Ok(json!({"secret_b64": null})),
        Err(e) => Err(anyhow!("keyring get: {e}")),
    }
}

fn op_keyring_delete(p: KeyringParams) -> Result<Value> {
    let entry =
        keyring::Entry::new(&p.service, &p.account).map_err(|e| anyhow!("keyring entry: {e}"))?;
    match entry.delete_credential() {
        Ok(_) => Ok(json!({"deleted": true})),
        Err(keyring::Error::NoEntry) => Ok(json!({"deleted": false})),
        Err(e) => Err(anyhow!("keyring delete: {e}")),
    }
}

type Spake2State = spake2::Spake2<spake2::Ed25519Group>;
static SPAKE_SESSIONS: std::sync::OnceLock<
    std::sync::Mutex<std::collections::HashMap<String, Spake2State>>,
> = std::sync::OnceLock::new();

fn spake_sessions() -> &'static std::sync::Mutex<std::collections::HashMap<String, Spake2State>> {
    SPAKE_SESSIONS.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()))
}

fn op_spake2_start(p: Spake2StartParams) -> Result<Value> {
    use spake2::{Ed25519Group, Identity, Password, Spake2};
    let pw = Password::new(p.passphrase.as_bytes());
    let our = Identity::new(p.our_id.as_bytes());
    let their = Identity::new(p.their_id.as_bytes());
    let (state, msg) = match p.role.as_str() {
        "a" => Spake2::<Ed25519Group>::start_a(&pw, &our, &their),
        "b" => Spake2::<Ed25519Group>::start_b(&pw, &our, &their),
        _ => return Err(anyhow!("role must be 'a' or 'b'")),
    };
    let session_id = uuid::Uuid::new_v4().to_string();
    spake_sessions()
        .lock()
        .unwrap()
        .insert(session_id.clone(), state);
    Ok(json!({
        "session_id": session_id,
        "msg_b64": b64_enc(&msg),
    }))
}

fn op_spake2_finish(p: Spake2FinishParams) -> Result<Value> {
    let peer_msg = b64_dec(&p.peer_msg_b64)?;
    let state = spake_sessions()
        .lock()
        .unwrap()
        .remove(&p.session_id)
        .ok_or_else(|| anyhow!("session not found"))?;
    let key = state
        .finish(&peer_msg)
        .map_err(|e| anyhow!("spake2 finish: {e:?}"))?;
    Ok(json!({"shared_key_b64": b64_enc(&key)}))
}

fn dispatch(req: Request) -> Response {
    let id = req.id.unwrap_or(Value::Null);
    let result: Result<Value> = match req.method.as_str() {
        "ping" => Ok(json!({"pong": true})),
        "blake3" => match serde_json::from_value(req.params) {
            Ok(p) => op_blake3(p),
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "ed25519_generate" => op_ed25519_generate(),
        "ed25519_sign" => match serde_json::from_value(req.params) {
            Ok(p) => op_ed25519_sign(p),
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "ed25519_verify" => match serde_json::from_value(req.params) {
            Ok(p) => op_ed25519_verify(p),
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "age_generate_identity" => op_age_generate_identity(),
        "age_encrypt" => match serde_json::from_value(req.params) {
            Ok(p) => op_age_encrypt(p),
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "age_decrypt" => match serde_json::from_value(req.params) {
            Ok(p) => op_age_decrypt(p),
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "keyring_set" => match serde_json::from_value(req.params) {
            Ok(p) => op_keyring_set(p),
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "keyring_get" => match serde_json::from_value(req.params) {
            Ok(p) => op_keyring_get(p),
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "keyring_delete" => match serde_json::from_value(req.params) {
            Ok(p) => op_keyring_delete(p),
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "spake2_start" => match serde_json::from_value(req.params) {
            Ok(p) => op_spake2_start(p),
            Err(e) => return err(id, -32602, e.to_string()),
        },
        "spake2_finish" => match serde_json::from_value(req.params) {
            Ok(p) => op_spake2_finish(p),
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

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .json()
        .init();
    info!(version = env!("CARGO_PKG_VERSION"), "crypto_port starting");

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
            Ok(req) => dispatch(req),
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
