#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;
use tracing::info;
use ulid::Ulid;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Note {
    id: String,
    title: String,
    body: String,
    #[serde(default)]
    created_at: Option<DateTime<Utc>>,
    #[serde(default)]
    updated_at: Option<DateTime<Utc>>,
    #[serde(default = "default_schema_ver")]
    schema_ver: u32,
    #[serde(default)]
    pinned: bool,
    #[serde(default)]
    trashed_at: Option<DateTime<Utc>>,
    /// Manual ordering for pinned notes (1-based; 0 = no manual order).
    /// Unpinned notes ignore this field.
    #[serde(default)]
    display_order: i32,
}

fn default_schema_ver() -> u32 {
    3
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct NoteSummary {
    id: String,
    title: String,
    updated_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pinned: bool,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    trashed_at: Option<DateTime<Utc>>,
    #[serde(default)]
    display_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SearchHit {
    id: String,
    title: String,
    updated_at: Option<DateTime<Utc>>,
    pinned: bool,
    tags: Vec<String>,
    snippet: String,
    match_in_body: bool,
}

fn extract_tags(text: &str) -> Vec<String> {
    let mut out: Vec<String> = vec![];
    let bytes = text.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'#' && (i == 0 || !bytes[i - 1].is_ascii_alphanumeric()) {
            let start = i + 1;
            let mut end = start;
            while end < bytes.len()
                && (bytes[end].is_ascii_alphanumeric() || bytes[end] == b'_' || bytes[end] == b'-')
            {
                end += 1;
            }
            if end > start + 1 {
                let tag = &text[start..end];
                let lower = tag.to_lowercase();
                if !out.contains(&lower) {
                    out.push(lower);
                }
            }
            i = end;
        } else {
            i += 1;
        }
    }
    out.sort();
    out
}

fn snippet(body: &str, needle: &str, radius: usize) -> String {
    if needle.is_empty() {
        let preview: String = body.chars().take(120).collect();
        return preview;
    }
    let hay = body.to_lowercase();
    let q = needle.to_lowercase();
    match hay.find(&q) {
        Some(pos) => {
            let start = pos.saturating_sub(radius);
            let end = (pos + needle.len() + radius).min(body.len());
            let mut s = String::new();
            if start > 0 {
                s.push('…');
            }
            s.push_str(&body[start..end].replace('\n', " "));
            if end < body.len() {
                s.push('…');
            }
            s
        }
        None => body.chars().take(120).collect(),
    }
}

struct Store {
    root: PathBuf,
    key: Option<[u8; 32]>,
}

impl Store {
    fn new(root: PathBuf) -> Result<Self> {
        fs::create_dir_all(&root).context("create notes dir")?;
        Ok(Store { root, key: None })
    }

    fn set_key(&mut self, key: Option<[u8; 32]>) {
        self.key = key;
    }

    fn note_path(&self, id: &str) -> PathBuf {
        self.root.join(format!("{}.json", id))
    }

    fn read_file_bytes(&self, p: &Path) -> Result<Vec<u8>> {
        let raw = fs::read(p)?;
        if let Some(key) = &self.key {
            if let Ok(text) = std::str::from_utf8(&raw) {
                if let Ok(env) = serde_json::from_str::<serde_json::Value>(text) {
                    if let Some(blob) = env.get("_enc1").and_then(|v| v.as_str()) {
                        return decrypt_from_disk(blob, key)
                            .map_err(|e| anyhow::anyhow!("decrypt failed: {}", e));
                    }
                }
            }
        }
        Ok(raw)
    }

    fn write_file_bytes(&self, p: &Path, data: &[u8]) -> Result<()> {
        let tmp = p.with_extension("json.tmp");
        if let Some(key) = &self.key {
            let blob = encrypt_for_disk(data, key)
                .map_err(|e| anyhow::anyhow!("encrypt failed: {}", e))?;
            let env = serde_json::json!({"_enc1": blob});
            fs::write(&tmp, serde_json::to_vec(&env)?)?;
        } else {
            fs::write(&tmp, data)?;
        }
        fs::rename(&tmp, p)?;
        Ok(())
    }

    fn all_notes(&self) -> Result<Vec<Note>> {
        let mut out = vec![];
        for entry in fs::read_dir(&self.root)? {
            let entry = entry?;
            let p = entry.path();
            if p.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            let bytes = match self.read_file_bytes(&p) {
                Ok(b) => b,
                Err(_) => continue,
            };
            let note: Note = match serde_json::from_slice(&bytes) {
                Ok(n) => n,
                Err(_) => continue,
            };
            out.push(note);
        }
        Ok(out)
    }

    fn summarize(note: &Note) -> NoteSummary {
        NoteSummary {
            id: note.id.clone(),
            title: note.title.clone(),
            updated_at: note.updated_at,
            pinned: note.pinned,
            tags: extract_tags(&note.body),
            trashed_at: note.trashed_at,
            display_order: note.display_order,
        }
    }

    fn list(&self) -> Result<Vec<NoteSummary>> {
        let mut out: Vec<NoteSummary> = self
            .all_notes()?
            .iter()
            .filter(|n| n.trashed_at.is_none())
            .map(Self::summarize)
            .collect();
        // Pinned (with manual order > 0 first, asc; then 0 by updated desc) > unpinned by updated.
        out.sort_by(|a, b| match (a.pinned, b.pinned) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            (true, true) => {
                let ao = if a.display_order > 0 {
                    a.display_order
                } else {
                    i32::MAX
                };
                let bo = if b.display_order > 0 {
                    b.display_order
                } else {
                    i32::MAX
                };
                ao.cmp(&bo).then_with(|| b.updated_at.cmp(&a.updated_at))
            }
            (false, false) => b.updated_at.cmp(&a.updated_at),
        });
        Ok(out)
    }

    fn list_trash(&self) -> Result<Vec<NoteSummary>> {
        let mut out: Vec<NoteSummary> = self
            .all_notes()?
            .iter()
            .filter(|n| n.trashed_at.is_some())
            .map(Self::summarize)
            .collect();
        out.sort_by_key(|b| std::cmp::Reverse(b.trashed_at));
        Ok(out)
    }

    fn get(&self, id: &str) -> Result<Option<Note>> {
        let p = self.note_path(id);
        if !p.exists() {
            return Ok(None);
        }
        let bytes = self.read_file_bytes(&p)?;
        let note: Note = serde_json::from_slice(&bytes)?;
        Ok(Some(note))
    }

    fn create(&self, title: String, body: String) -> Result<Note> {
        let now = Utc::now();
        let note = Note {
            id: Ulid::new().to_string(),
            title,
            body,
            created_at: Some(now),
            updated_at: Some(now),
            schema_ver: 3,
            pinned: false,
            trashed_at: None,
            display_order: 0,
        };
        self.write(&note)?;
        Ok(note)
    }

    fn set_display_order(&self, id: &str, order: i32) -> Result<()> {
        let mut note = self
            .get(id)?
            .ok_or_else(|| anyhow::anyhow!("note not found: {}", id))?;
        note.display_order = order;
        self.write(&note)?;
        Ok(())
    }

    fn update(&self, id: &str, title: Option<String>, body: Option<String>) -> Result<Note> {
        let mut note = self
            .get(id)?
            .ok_or_else(|| anyhow::anyhow!("note not found: {}", id))?;
        if let Some(t) = title {
            note.title = t;
        }
        if let Some(b) = body {
            note.body = b;
        }
        note.updated_at = Some(Utc::now());
        self.write(&note)?;
        Ok(note)
    }

    fn set_pinned(&self, id: &str, pinned: bool) -> Result<Note> {
        let mut note = self
            .get(id)?
            .ok_or_else(|| anyhow::anyhow!("note not found: {}", id))?;
        note.pinned = pinned;
        self.write(&note)?;
        Ok(note)
    }

    fn trash(&self, id: &str) -> Result<()> {
        let mut note = self
            .get(id)?
            .ok_or_else(|| anyhow::anyhow!("note not found: {}", id))?;
        note.trashed_at = Some(Utc::now());
        self.write(&note)?;
        Ok(())
    }

    fn restore(&self, id: &str) -> Result<()> {
        let mut note = self
            .get(id)?
            .ok_or_else(|| anyhow::anyhow!("note not found: {}", id))?;
        note.trashed_at = None;
        self.write(&note)?;
        Ok(())
    }

    fn purge(&self, id: &str) -> Result<()> {
        let p = self.note_path(id);
        if p.exists() {
            fs::remove_file(p)?;
        }
        Ok(())
    }

    fn empty_trash(&self) -> Result<u32> {
        let mut n = 0u32;
        for note in self.all_notes()? {
            if note.trashed_at.is_some() {
                self.purge(&note.id)?;
                n += 1;
            }
        }
        Ok(n)
    }

    #[allow(dead_code)]
    fn auto_purge_old_trash(&self, days: i64) -> Result<u32> {
        let cutoff = Utc::now() - chrono::Duration::days(days);
        let mut n = 0u32;
        for note in self.all_notes()? {
            if let Some(t) = note.trashed_at {
                if t < cutoff {
                    self.purge(&note.id)?;
                    n += 1;
                }
            }
        }
        Ok(n)
    }

    fn search(&self, query: &str) -> Result<Vec<SearchHit>> {
        let q = query.trim();
        let lower = q.to_lowercase();
        let mut out: Vec<SearchHit> = vec![];
        for note in self.all_notes()? {
            if note.trashed_at.is_some() {
                continue;
            }
            let title_lc = note.title.to_lowercase();
            let body_lc = note.body.to_lowercase();
            let in_title = !q.is_empty() && title_lc.contains(&lower);
            let in_body = !q.is_empty() && body_lc.contains(&lower);
            if q.is_empty() || in_title || in_body {
                out.push(SearchHit {
                    id: note.id.clone(),
                    title: note.title.clone(),
                    updated_at: note.updated_at,
                    pinned: note.pinned,
                    tags: extract_tags(&note.body),
                    snippet: snippet(&note.body, q, 50),
                    match_in_body: in_body,
                });
            }
        }
        out.sort_by(|a, b| {
            b.pinned
                .cmp(&a.pinned)
                .then_with(|| b.updated_at.cmp(&a.updated_at))
        });
        Ok(out)
    }

    fn write(&self, note: &Note) -> Result<()> {
        let p = self.note_path(&note.id);
        let bytes = serde_json::to_vec_pretty(note)?;
        self.write_file_bytes(&p, &bytes)
    }

    fn rewrite_all(&self) -> Result<()> {
        let notes = self.all_notes()?;
        for note in notes {
            self.write(&note)?;
        }
        Ok(())
    }
}

struct AppState {
    store: Mutex<Store>,
    unlocked: Mutex<bool>,
}

fn compute_verifier(salt_hex: &str, passphrase: &str) -> String {
    let salt = hex_decode(salt_hex).unwrap_or_default();
    let mut hasher = blake3::Hasher::new();
    hasher.update(b"mycelium-lock-v1");
    hasher.update(&salt);
    hasher.update(passphrase.as_bytes());
    let mut acc = hasher.finalize();
    for _ in 0..50_000 {
        acc = blake3::hash(acc.as_bytes());
    }
    hex_encode(acc.as_bytes())
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push_str(&format!("{:02x}", b));
    }
    s
}

fn hex_decode(s: &str) -> Option<Vec<u8>> {
    if s.len() % 2 != 0 {
        return None;
    }
    let mut out = Vec::with_capacity(s.len() / 2);
    for i in (0..s.len()).step_by(2) {
        let byte = u8::from_str_radix(&s[i..i + 2], 16).ok()?;
        out.push(byte);
    }
    Some(out)
}

fn check_unlocked(state: &State<'_, AppState>) -> Result<(), String> {
    let settings = get_settings();
    if settings.lock.is_some() && !*state.unlocked.lock().unwrap() {
        return Err("workspace is locked".into());
    }
    Ok(())
}

fn derive_master_key(salt_hex: &str, passphrase: &str) -> [u8; 32] {
    let salt = hex_decode(salt_hex).unwrap_or_default();
    let mut hasher = blake3::Hasher::new();
    hasher.update(b"mycelium-master-key-v1");
    hasher.update(&salt);
    hasher.update(passphrase.as_bytes());
    let mut acc = hasher.finalize();
    for _ in 0..50_000 {
        acc = blake3::hash(acc.as_bytes());
    }
    *acc.as_bytes()
}

fn encrypt_for_disk(plaintext: &[u8], key: &[u8; 32]) -> Result<String, String> {
    use base64::Engine;
    use chacha20poly1305::{aead::Aead, ChaCha20Poly1305, KeyInit, Nonce};
    use rand::RngCore;
    let cipher = ChaCha20Poly1305::new_from_slice(key).map_err(|e| format!("key init: {}", e))?;
    let mut nonce_bytes = [0u8; 12];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ct = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("encrypt: {}", e))?;
    let mut out = Vec::with_capacity(12 + ct.len());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ct);
    Ok(base64::engine::general_purpose::STANDARD.encode(out))
}

fn decrypt_from_disk(b64: &str, key: &[u8; 32]) -> Result<Vec<u8>, String> {
    use base64::Engine;
    use chacha20poly1305::{aead::Aead, ChaCha20Poly1305, KeyInit, Nonce};
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64.as_bytes())
        .map_err(|e| format!("base64: {}", e))?;
    if bytes.len() < 12 {
        return Err("ciphertext too short".into());
    }
    let cipher = ChaCha20Poly1305::new_from_slice(key).map_err(|e| format!("key init: {}", e))?;
    let nonce = Nonce::from_slice(&bytes[..12]);
    cipher
        .decrypt(nonce, &bytes[12..])
        .map_err(|e| format!("decrypt: {}", e))
}

#[tauri::command]
fn lock_status(state: State<'_, AppState>) -> serde_json::Value {
    let settings = get_settings();
    let enabled = settings.lock.is_some();
    let locked = enabled && !*state.unlocked.lock().unwrap();
    serde_json::json!({ "enabled": enabled, "locked": locked })
}

#[tauri::command]
fn lock_set(
    state: State<'_, AppState>,
    old_passphrase: Option<String>,
    new_passphrase: String,
) -> Result<(), String> {
    if new_passphrase.len() < 6 {
        return Err("passphrase must be at least 6 characters".into());
    }
    let mut settings = get_settings();

    let was_enabled = settings.lock.is_some();
    if was_enabled {
        let provided = old_passphrase.clone().unwrap_or_default();
        let existing = settings.lock.as_ref().unwrap();
        if compute_verifier(&existing.salt, &provided) != existing.verifier {
            return Err("current passphrase is incorrect".into());
        }
        let old_key = derive_master_key(&existing.salt, &provided);
        state.store.lock().unwrap().set_key(Some(old_key));
        state
            .store
            .lock()
            .unwrap()
            .rewrite_all()
            .map_err(|e| format!("decrypt notes failed: {}", e))?;
        state.store.lock().unwrap().set_key(None);
    }

    use rand::RngCore;
    let mut salt = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    let salt_hex = hex_encode(&salt);
    let verifier = compute_verifier(&salt_hex, &new_passphrase);
    settings.lock = Some(LockConfig {
        salt: salt_hex.clone(),
        verifier,
    });
    set_settings(settings)?;

    let new_key = derive_master_key(&salt_hex, &new_passphrase);
    state.store.lock().unwrap().set_key(Some(new_key));
    state
        .store
        .lock()
        .unwrap()
        .rewrite_all()
        .map_err(|e| format!("encrypt notes failed: {}", e))?;
    *state.unlocked.lock().unwrap() = true;
    Ok(())
}

#[tauri::command]
fn lock_disable(state: State<'_, AppState>, passphrase: String) -> Result<(), String> {
    let mut settings = get_settings();
    let existing = settings
        .lock
        .clone()
        .ok_or_else(|| "lock not enabled".to_string())?;
    if compute_verifier(&existing.salt, &passphrase) != existing.verifier {
        return Err("passphrase incorrect".into());
    }
    let key = derive_master_key(&existing.salt, &passphrase);
    state.store.lock().unwrap().set_key(Some(key));
    state
        .store
        .lock()
        .unwrap()
        .rewrite_all()
        .map_err(|e| format!("decrypt failed: {}", e))?;
    state.store.lock().unwrap().set_key(None);

    settings.lock = None;
    set_settings(settings)?;
    *state.unlocked.lock().unwrap() = true;
    Ok(())
}

#[tauri::command]
fn lock_unlock(state: State<'_, AppState>, passphrase: String) -> Result<bool, String> {
    let settings = get_settings();
    let existing = settings
        .lock
        .clone()
        .ok_or_else(|| "lock not enabled".to_string())?;
    if compute_verifier(&existing.salt, &passphrase) == existing.verifier {
        let key = derive_master_key(&existing.salt, &passphrase);
        state.store.lock().unwrap().set_key(Some(key));
        *state.unlocked.lock().unwrap() = true;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn lock_now(state: State<'_, AppState>) -> Result<(), String> {
    state.store.lock().unwrap().set_key(None);
    *state.unlocked.lock().unwrap() = false;
    Ok(())
}

#[tauri::command]
fn list_notes(state: State<'_, AppState>) -> Result<Vec<NoteSummary>, String> {
    check_unlocked(&state)?;
    state
        .store
        .lock()
        .unwrap()
        .list()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_note(state: State<'_, AppState>, id: String) -> Result<Option<Note>, String> {
    check_unlocked(&state)?;
    state
        .store
        .lock()
        .unwrap()
        .get(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_note(state: State<'_, AppState>, title: String, body: String) -> Result<Note, String> {
    check_unlocked(&state)?;
    state
        .store
        .lock()
        .unwrap()
        .create(title, body)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_note(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    body: Option<String>,
) -> Result<Note, String> {
    state
        .store
        .lock()
        .unwrap()
        .update(&id, title, body)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_note(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state
        .store
        .lock()
        .unwrap()
        .trash(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_trash(state: State<'_, AppState>) -> Result<Vec<NoteSummary>, String> {
    state
        .store
        .lock()
        .unwrap()
        .list_trash()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_note(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state
        .store
        .lock()
        .unwrap()
        .restore(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn purge_note(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state
        .store
        .lock()
        .unwrap()
        .purge(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn empty_trash(state: State<'_, AppState>) -> Result<u32, String> {
    state
        .store
        .lock()
        .unwrap()
        .empty_trash()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_pinned(state: State<'_, AppState>, id: String, pinned: bool) -> Result<Note, String> {
    state
        .store
        .lock()
        .unwrap()
        .set_pinned(&id, pinned)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_note_order(state: State<'_, AppState>, id: String, order: i32) -> Result<(), String> {
    check_unlocked(&state)?;
    state
        .store
        .lock()
        .unwrap()
        .set_display_order(&id, order)
        .map_err(|e| e.to_string())
}

/// Renumber a list of pinned note ids to 1..N based on the order they appear.
/// Any pinned note not in the list is kept (its previous order is left unchanged).
#[tauri::command]
fn reorder_pinned(state: State<'_, AppState>, ids: Vec<String>) -> Result<(), String> {
    check_unlocked(&state)?;
    let store = state.store.lock().unwrap();
    for (i, id) in ids.iter().enumerate() {
        store
            .set_display_order(id, (i + 1) as i32)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn bulk_set_pinned(
    state: State<'_, AppState>,
    ids: Vec<String>,
    pinned: bool,
) -> Result<u32, String> {
    check_unlocked(&state)?;
    let store = state.store.lock().unwrap();
    let mut n = 0u32;
    for id in ids {
        if store.set_pinned(&id, pinned).is_ok() {
            n += 1;
        }
    }
    Ok(n)
}

#[tauri::command]
fn bulk_trash(state: State<'_, AppState>, ids: Vec<String>) -> Result<u32, String> {
    check_unlocked(&state)?;
    let store = state.store.lock().unwrap();
    let mut n = 0u32;
    for id in ids {
        if store.trash(&id).is_ok() {
            n += 1;
        }
    }
    Ok(n)
}

#[tauri::command]
fn bulk_export_md(
    state: State<'_, AppState>,
    ids: Vec<String>,
) -> Result<Vec<(String, String)>, String> {
    check_unlocked(&state)?;
    let store = state.store.lock().unwrap();
    let mut out = vec![];
    for id in ids {
        let note = match store.get(&id).map_err(|e| e.to_string())? {
            Some(n) => n,
            None => continue,
        };
        let title = if note.title.is_empty() {
            "Untitled".into()
        } else {
            note.title.clone()
        };
        let safe = title
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == ' ' {
                    c
                } else {
                    '_'
                }
            })
            .collect::<String>();
        let filename = format!("{}.md", safe.trim());
        let mut content = format!("# {}\n\n", title);
        if let Some(t) = note.updated_at {
            content.push_str(&format!("> Updated: {}\n\n", t.to_rfc3339()));
        }
        content.push_str(&note.body);
        if !content.ends_with('\n') {
            content.push('\n');
        }
        out.push((filename, content));
    }
    Ok(out)
}

#[tauri::command]
fn search_notes(state: State<'_, AppState>, query: String) -> Result<Vec<SearchHit>, String> {
    state
        .store
        .lock()
        .unwrap()
        .search(&query)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn all_tags(state: State<'_, AppState>) -> Result<Vec<(String, u32)>, String> {
    let notes = state
        .store
        .lock()
        .unwrap()
        .all_notes()
        .map_err(|e| e.to_string())?;
    let mut counts: std::collections::BTreeMap<String, u32> = std::collections::BTreeMap::new();
    for note in notes {
        if note.trashed_at.is_some() {
            continue;
        }
        for t in extract_tags(&note.body) {
            *counts.entry(t).or_insert(0) += 1;
        }
    }
    let mut out: Vec<(String, u32)> = counts.into_iter().collect();
    out.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    Ok(out)
}

// --- v0.16 — frontmatter (very small YAML-ish subset) ----------------
//
// Supports a `---`-fenced block at the top of a note containing
// `key: value` lines. Anything more complex (nested maps, multi-line
// scalars, real YAML) is treated as opaque value text. This is
// intentionally tiny and dependency-free.
fn parse_frontmatter(body: &str) -> (Vec<(String, String)>, &str) {
    let trimmed = body.trim_start_matches('\u{FEFF}');
    if !trimmed.starts_with("---\n") && !trimmed.starts_with("---\r\n") {
        return (vec![], body);
    }
    let after_open = if trimmed.starts_with("---\r\n") { 5 } else { 4 };
    let rest = &trimmed[after_open..];
    let close_pos = rest
        .find("\n---\n")
        .or_else(|| rest.find("\n---\r\n"))
        .or_else(|| {
            if rest.starts_with("---\n") || rest.starts_with("---\r\n") {
                Some(0)
            } else {
                None
            }
        });
    let Some(pos) = close_pos else {
        return (vec![], body);
    };
    let block = &rest[..pos];
    let after_close_offset = if rest[pos..].starts_with("\n---\r\n") {
        pos + 6
    } else {
        pos + 5
    };
    let body_after = if after_close_offset >= rest.len() {
        ""
    } else {
        &rest[after_close_offset..]
    };
    let body_after = body_after.trim_start_matches(['\n', '\r']);
    let mut out = vec![];
    for line in block.lines() {
        let line = line.trim_end_matches('\r');
        if line.trim().is_empty() {
            continue;
        }
        if let Some(idx) = line.find(':') {
            let key = line[..idx].trim();
            let value = line[idx + 1..].trim();
            if !key.is_empty() {
                out.push((key.to_string(), value.to_string()));
            }
        }
    }
    (out, body_after)
}

#[tauri::command]
fn note_properties(state: State<'_, AppState>, id: String) -> Result<serde_json::Value, String> {
    check_unlocked(&state)?;
    let note = state
        .store
        .lock()
        .unwrap()
        .get(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "note not found".to_string())?;
    let (props, _rest) = parse_frontmatter(&note.body);
    let map: serde_json::Map<String, serde_json::Value> = props
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::String(v)))
        .collect();
    Ok(serde_json::Value::Object(map))
}

#[tauri::command]
fn notes_by_property(
    state: State<'_, AppState>,
    key: String,
    value: Option<String>,
) -> Result<Vec<NoteSummary>, String> {
    check_unlocked(&state)?;
    let key_lc = key.trim().to_lowercase();
    if key_lc.is_empty() {
        return Err("property key empty".into());
    }
    let value_match = value.map(|v| v.trim().to_lowercase());
    let store = state.store.lock().unwrap();
    let notes = store.all_notes().map_err(|e| e.to_string())?;
    let mut out: Vec<NoteSummary> = vec![];
    for n in &notes {
        if n.trashed_at.is_some() {
            continue;
        }
        let (props, _) = parse_frontmatter(&n.body);
        let mut hit = false;
        for (k, v) in &props {
            if k.to_lowercase() != key_lc {
                continue;
            }
            match &value_match {
                None => {
                    hit = true;
                    break;
                }
                Some(want) => {
                    if &v.to_lowercase() == want {
                        hit = true;
                        break;
                    }
                }
            }
        }
        if hit {
            out.push(Store::summarize(n));
        }
    }
    out.sort_by_key(|s| std::cmp::Reverse(s.updated_at));
    Ok(out)
}

/// Set / replace / delete one frontmatter property. If `value` is None, the property is removed.
/// If the note has no frontmatter block yet, one is created.
#[tauri::command]
fn set_property(
    state: State<'_, AppState>,
    id: String,
    key: String,
    value: Option<String>,
) -> Result<Note, String> {
    check_unlocked(&state)?;
    let key = key.trim().to_string();
    if key.is_empty() {
        return Err("property key empty".into());
    }
    let store = state.store.lock().unwrap();
    let note = store
        .get(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "note not found".to_string())?;
    let new_body = rewrite_property(&note.body, &key, value.as_deref());
    drop(store);
    state
        .store
        .lock()
        .unwrap()
        .update(&id, None, Some(new_body))
        .map_err(|e| e.to_string())
}

fn rewrite_property(body: &str, key: &str, value: Option<&str>) -> String {
    let (mut props, rest) = parse_frontmatter(body);
    let key_lc = key.to_lowercase();
    let mut found = false;
    props.retain_mut(|(k, v)| {
        if k.to_lowercase() == key_lc {
            if let Some(new_value) = value {
                *v = new_value.to_string();
                found = true;
                true
            } else {
                false
            }
        } else {
            true
        }
    });
    if !found {
        if let Some(new_value) = value {
            props.push((key.to_string(), new_value.to_string()));
        }
    }
    if props.is_empty() {
        return rest.to_string();
    }
    let mut out = String::with_capacity(rest.len() + 64);
    out.push_str("---\n");
    for (k, v) in props {
        out.push_str(&k);
        out.push_str(": ");
        out.push_str(&v);
        out.push('\n');
    }
    out.push_str("---\n");
    if !rest.is_empty() {
        out.push('\n');
        out.push_str(rest);
    }
    out
}

/// Month-grid calendar grouping notes by a frontmatter date property (default `due`).
/// Returns the matrix of weeks (each week is 7 days; each day has a list of notes due that day).
/// `year` / `month` are 1-based ISO. Notes whose property doesn't parse as `YYYY-MM-DD` are ignored.
#[tauri::command]
fn month_calendar(
    state: State<'_, AppState>,
    year: i32,
    month: u32,
    key: Option<String>,
) -> Result<serde_json::Value, String> {
    check_unlocked(&state)?;
    if !(1..=12).contains(&month) {
        return Err("month must be 1..=12".into());
    }
    let key_lc = key
        .unwrap_or_else(|| "due".to_string())
        .trim()
        .to_lowercase();
    let store = state.store.lock().unwrap();
    let notes = store.all_notes().map_err(|e| e.to_string())?;
    drop(store);
    let mut by_day: std::collections::BTreeMap<String, Vec<serde_json::Value>> =
        std::collections::BTreeMap::new();
    for n in &notes {
        if n.trashed_at.is_some() {
            continue;
        }
        let (props, _) = parse_frontmatter(&n.body);
        for (k, v) in &props {
            if k.to_lowercase() != key_lc {
                continue;
            }
            // Accept `YYYY-MM-DD` and longer ISO timestamps. Anything else is skipped.
            let day = v.get(..10).unwrap_or("");
            if day.len() != 10
                || !day.is_char_boundary(4)
                || !day.is_char_boundary(7)
                || day.as_bytes().get(4) != Some(&b'-')
                || day.as_bytes().get(7) != Some(&b'-')
            {
                continue;
            }
            // Confirm year and month numerically.
            let parsed_year: i32 = match day[..4].parse() {
                Ok(y) => y,
                Err(_) => continue,
            };
            let parsed_month: u32 = match day[5..7].parse() {
                Ok(m) => m,
                Err(_) => continue,
            };
            if parsed_year != year || parsed_month != month {
                continue;
            }
            by_day
                .entry(day.to_string())
                .or_default()
                .push(serde_json::json!({
                    "id": n.id,
                    "title": if n.title.trim().is_empty() { "Untitled" } else { &n.title },
                    "pinned": n.pinned,
                }));
            break;
        }
    }
    Ok(serde_json::json!({
        "year": year,
        "month": month,
        "property": key_lc,
        "by_day": by_day,
    }))
}

/// Suggest related notes for `id`, ranked by shared tags, shared frontmatter values, and
/// shared outgoing wiki-link targets. Returns at most `limit` (default 6) summaries, never
/// including the source note itself.
#[tauri::command]
fn suggested_notes(
    state: State<'_, AppState>,
    id: String,
    limit: Option<u32>,
) -> Result<Vec<NoteSummary>, String> {
    check_unlocked(&state)?;
    let limit = limit.unwrap_or(6).clamp(1, 50) as usize;
    let store = state.store.lock().unwrap();
    let me = store
        .get(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "note not found".to_string())?;
    let all = store.all_notes().map_err(|e| e.to_string())?;
    drop(store);

    let my_tags: std::collections::HashSet<String> = extract_tags(&me.body).into_iter().collect();
    let (my_props, _) = parse_frontmatter(&me.body);
    let my_prop_kv: std::collections::HashSet<(String, String)> = my_props
        .iter()
        .map(|(k, v)| (k.to_lowercase(), v.to_lowercase()))
        .collect();
    let mut my_outgoing: std::collections::HashSet<String> = std::collections::HashSet::new();
    let finder = WikiLinkFinder;
    for (a, b) in finder.find_iter(&me.body) {
        let mut t = me.body[a + 2..b - 2].to_string();
        if let Some((p, _)) = t.split_once('|') {
            t = p.to_string();
        }
        if let Some((p, _)) = t.split_once('#') {
            t = p.to_string();
        }
        let lc = t.trim().to_lowercase();
        if !lc.is_empty() {
            my_outgoing.insert(lc);
        }
    }

    let mut scored: Vec<(u32, &Note)> = vec![];
    for n in &all {
        if n.id == me.id || n.trashed_at.is_some() {
            continue;
        }
        let other_tags: std::collections::HashSet<String> =
            extract_tags(&n.body).into_iter().collect();
        let shared_tags = my_tags.intersection(&other_tags).count() as u32;
        let (other_props, _) = parse_frontmatter(&n.body);
        let other_prop_kv: std::collections::HashSet<(String, String)> = other_props
            .iter()
            .map(|(k, v)| (k.to_lowercase(), v.to_lowercase()))
            .collect();
        let shared_props = my_prop_kv.intersection(&other_prop_kv).count() as u32;
        let mut other_outgoing: std::collections::HashSet<String> =
            std::collections::HashSet::new();
        for (a, b) in finder.find_iter(&n.body) {
            let mut t = n.body[a + 2..b - 2].to_string();
            if let Some((p, _)) = t.split_once('|') {
                t = p.to_string();
            }
            if let Some((p, _)) = t.split_once('#') {
                t = p.to_string();
            }
            let lc = t.trim().to_lowercase();
            if !lc.is_empty() {
                other_outgoing.insert(lc);
            }
        }
        let shared_links = my_outgoing.intersection(&other_outgoing).count() as u32;
        let score = shared_tags * 2 + shared_props + shared_links;
        if score > 0 {
            scored.push((score, n));
        }
    }
    scored.sort_by(|a, b| {
        b.0.cmp(&a.0).then_with(|| {
            b.1.updated_at
                .unwrap_or_default()
                .cmp(&a.1.updated_at.unwrap_or_default())
        })
    });
    Ok(scored
        .into_iter()
        .take(limit)
        .map(|(_, n)| Store::summarize(n))
        .collect())
}

/// Resolve a wiki-link target to a note id, handling aliases and `Title#Heading` block refs.
/// `target` is everything between `[[` and `]]` minus any `|display`. Returns
/// `{ id?: String, title?: String, anchor?: String }` (anchor present iff `#` was used).
#[tauri::command]
fn resolve_link(state: State<'_, AppState>, target: String) -> Result<serde_json::Value, String> {
    check_unlocked(&state)?;
    let raw = target.trim().to_string();
    if raw.is_empty() {
        return Ok(serde_json::json!({}));
    }
    let (link_part, anchor) = match raw.split_once('#') {
        Some((l, a)) => (l.trim().to_string(), Some(a.trim().to_string())),
        None => (raw.clone(), None),
    };
    if link_part.is_empty() {
        return Ok(serde_json::json!({"anchor": anchor}));
    }
    let want = link_part.to_lowercase();
    let store = state.store.lock().unwrap();
    let notes = store.all_notes().map_err(|e| e.to_string())?;
    drop(store);
    // Exact title match first.
    for n in &notes {
        if n.trashed_at.is_some() {
            continue;
        }
        if n.title.to_lowercase() == want {
            return Ok(serde_json::json!({
                "id": n.id, "title": n.title, "anchor": anchor
            }));
        }
    }
    // Then alias match in frontmatter (`alias: foo, bar` or `aliases:`).
    for n in &notes {
        if n.trashed_at.is_some() {
            continue;
        }
        let (props, _) = parse_frontmatter(&n.body);
        for (k, v) in &props {
            let lc = k.to_lowercase();
            if lc != "alias" && lc != "aliases" {
                continue;
            }
            for piece in v.split(',') {
                if piece.trim().to_lowercase() == want {
                    return Ok(serde_json::json!({
                        "id": n.id, "title": n.title, "anchor": anchor
                    }));
                }
            }
        }
    }
    Ok(serde_json::json!({"anchor": anchor}))
}

/// Every note that publishes one or more aliases via frontmatter.
#[tauri::command]
fn all_aliases(state: State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    check_unlocked(&state)?;
    let store = state.store.lock().unwrap();
    let notes = store.all_notes().map_err(|e| e.to_string())?;
    let mut out = vec![];
    for n in notes {
        if n.trashed_at.is_some() {
            continue;
        }
        let (props, _) = parse_frontmatter(&n.body);
        for (k, v) in props {
            let lc = k.to_lowercase();
            if lc == "alias" || lc == "aliases" {
                let aliases: Vec<String> = v
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();
                if !aliases.is_empty() {
                    out.push(serde_json::json!({
                        "id": n.id,
                        "title": n.title,
                        "aliases": aliases,
                    }));
                }
                break;
            }
        }
    }
    Ok(out)
}

/// Run a tiny query DSL across the workspace. Supported forms:
/// - `tag=NAME`  → notes carrying #NAME
/// - `KEY=VALUE` → notes with frontmatter `KEY: VALUE`
/// - `KEY`       → notes that have any value for frontmatter KEY
/// - `orphan`    → notes with zero in/out wiki-links
/// - `pinned`    → pinned notes
/// - `untitled`  → notes with empty title
/// All matches are case-insensitive on keys/values; values are exact matches.
#[tauri::command]
fn query_notes(state: State<'_, AppState>, query: String) -> Result<Vec<NoteSummary>, String> {
    check_unlocked(&state)?;
    let q = query.trim().to_string();
    if q.is_empty() {
        return Ok(vec![]);
    }
    let lc = q.to_lowercase();
    let store = state.store.lock().unwrap();
    let notes = store.all_notes().map_err(|e| e.to_string())?;
    drop(store);
    if lc == "orphan" || lc == "orphans" {
        return orphan_notes(state);
    }
    if lc == "pinned" {
        let mut out: Vec<NoteSummary> = notes
            .iter()
            .filter(|n| n.trashed_at.is_none() && n.pinned)
            .map(Store::summarize)
            .collect();
        out.sort_by_key(|s| std::cmp::Reverse(s.updated_at));
        return Ok(out);
    }
    if lc == "untitled" {
        let mut out: Vec<NoteSummary> = notes
            .iter()
            .filter(|n| n.trashed_at.is_none() && n.title.trim().is_empty())
            .map(Store::summarize)
            .collect();
        out.sort_by_key(|s| std::cmp::Reverse(s.updated_at));
        return Ok(out);
    }
    // Parse `[key]=[value]` or `key`.
    let (key_raw, value_opt) = match q.split_once('=') {
        Some((k, v)) => (k.trim().to_string(), Some(v.trim().to_string())),
        None => (q.clone(), None),
    };
    let key = key_raw.to_lowercase();

    if key == "tag" {
        let want = value_opt.unwrap_or_default().to_lowercase();
        if want.is_empty() {
            return Err("tag query requires a value (tag=name)".into());
        }
        let mut out: Vec<NoteSummary> = notes
            .iter()
            .filter(|n| n.trashed_at.is_none() && extract_tags(&n.body).iter().any(|t| t == &want))
            .map(Store::summarize)
            .collect();
        out.sort_by_key(|s| std::cmp::Reverse(s.updated_at));
        return Ok(out);
    }

    let want_value = value_opt.map(|v| v.to_lowercase());
    let mut out: Vec<NoteSummary> = vec![];
    for n in &notes {
        if n.trashed_at.is_some() {
            continue;
        }
        let (props, _) = parse_frontmatter(&n.body);
        let mut hit = false;
        for (k, v) in &props {
            if k.to_lowercase() != key {
                continue;
            }
            match &want_value {
                None => {
                    hit = true;
                    break;
                }
                Some(want) => {
                    if &v.to_lowercase() == want {
                        hit = true;
                        break;
                    }
                }
            }
        }
        if hit {
            out.push(Store::summarize(n));
        }
    }
    out.sort_by_key(|s| std::cmp::Reverse(s.updated_at));
    Ok(out)
}

/// Group notes into columns by frontmatter property `key`. Notes lacking that property go into
/// the synthetic "(none)" column. Columns are returned in the order their values were first seen.
#[tauri::command]
fn board_data(state: State<'_, AppState>, key: String) -> Result<serde_json::Value, String> {
    check_unlocked(&state)?;
    let key_lc = key.trim().to_lowercase();
    if key_lc.is_empty() {
        return Err("property key empty".into());
    }
    let store = state.store.lock().unwrap();
    let notes = store.all_notes().map_err(|e| e.to_string())?;
    let mut order: Vec<String> = vec![];
    let mut groups: std::collections::HashMap<String, Vec<serde_json::Value>> =
        std::collections::HashMap::new();
    for n in &notes {
        if n.trashed_at.is_some() {
            continue;
        }
        let (props, _) = parse_frontmatter(&n.body);
        let val = props
            .into_iter()
            .find(|(k, _)| k.to_lowercase() == key_lc)
            .map(|(_, v)| v)
            .unwrap_or_else(|| "(none)".to_string());
        if !order.contains(&val) {
            order.push(val.clone());
        }
        let preview: String = n.body.chars().take(120).collect();
        groups.entry(val).or_default().push(serde_json::json!({
            "id": n.id,
            "title": if n.title.trim().is_empty() { "Untitled" } else { &n.title },
            "preview": preview,
            "pinned": n.pinned,
            "updated_at": n.updated_at,
        }));
    }
    let mut columns = vec![];
    for val in order {
        let cards = groups.remove(&val).unwrap_or_default();
        columns.push(serde_json::json!({
            "value": val,
            "count": cards.len(),
            "cards": cards,
        }));
    }
    Ok(serde_json::json!({
        "property": key,
        "columns": columns,
    }))
}

#[tauri::command]
fn all_property_keys(state: State<'_, AppState>) -> Result<Vec<(String, u32)>, String> {
    check_unlocked(&state)?;
    let store = state.store.lock().unwrap();
    let notes = store.all_notes().map_err(|e| e.to_string())?;
    let mut counts: std::collections::BTreeMap<String, u32> = std::collections::BTreeMap::new();
    for n in &notes {
        if n.trashed_at.is_some() {
            continue;
        }
        let (props, _) = parse_frontmatter(&n.body);
        let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
        for (k, _) in &props {
            let lc = k.to_lowercase();
            if seen.insert(lc.clone()) {
                *counts.entry(lc).or_insert(0) += 1;
            }
        }
    }
    let mut out: Vec<(String, u32)> = counts.into_iter().collect();
    out.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    Ok(out)
}

#[tauri::command]
fn outgoing_links(
    state: State<'_, AppState>,
    id: String,
) -> Result<Vec<serde_json::Value>, String> {
    check_unlocked(&state)?;
    let store = state.store.lock().unwrap();
    let note = store
        .get(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "note not found".to_string())?;
    let all = store.all_notes().map_err(|e| e.to_string())?;
    let mut title_to_id: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for n in &all {
        if n.trashed_at.is_some() {
            continue;
        }
        if !n.title.trim().is_empty() {
            title_to_id.insert(n.title.to_lowercase(), n.id.clone());
        }
    }
    let finder = WikiLinkFinder;
    let mut seen: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    let mut out = vec![];
    for (a, b) in finder.find_iter(&note.body) {
        let target = note.body[a + 2..b - 2].trim();
        if target.is_empty() {
            continue;
        }
        let key = target.to_lowercase();
        if !seen.insert(key.clone()) {
            continue;
        }
        let exists = title_to_id.get(&key).cloned();
        out.push(serde_json::json!({
            "title": target,
            "exists": exists.is_some(),
            "id": exists,
        }));
    }
    Ok(out)
}

/// Notes with zero incoming AND zero outgoing wiki-links (excluding trashed).
#[tauri::command]
fn orphan_notes(state: State<'_, AppState>) -> Result<Vec<NoteSummary>, String> {
    check_unlocked(&state)?;
    let store = state.store.lock().unwrap();
    let all = store.all_notes().map_err(|e| e.to_string())?;
    let mut title_to_id: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut active: Vec<&Note> = vec![];
    for n in &all {
        if n.trashed_at.is_some() {
            continue;
        }
        if !n.title.trim().is_empty() {
            title_to_id.insert(n.title.to_lowercase(), n.id.clone());
        }
        active.push(n);
    }
    let finder = WikiLinkFinder;
    let mut incoming: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut outgoing: std::collections::HashSet<String> = std::collections::HashSet::new();
    for n in &active {
        for (a, b) in finder.find_iter(&n.body) {
            let target = n.body[a + 2..b - 2].trim().to_lowercase();
            if let Some(target_id) = title_to_id.get(&target) {
                if target_id != &n.id {
                    incoming.insert(target_id.clone());
                    outgoing.insert(n.id.clone());
                }
            }
        }
    }
    let mut out: Vec<NoteSummary> = active
        .iter()
        .filter(|n| !incoming.contains(&n.id) && !outgoing.contains(&n.id))
        .map(|n| Store::summarize(n))
        .collect();
    out.sort_by_key(|s| std::cmp::Reverse(s.updated_at));
    Ok(out)
}

/// Rename `#oldtag` to `#newtag` across every non-trashed note's body.
/// Returns the number of notes touched.
#[tauri::command]
fn rename_tag(state: State<'_, AppState>, old_tag: String, new_tag: String) -> Result<u32, String> {
    check_unlocked(&state)?;
    let old_lc = old_tag.trim().to_lowercase();
    let new_lc = new_tag.trim().to_lowercase();
    if old_lc.is_empty() || new_lc.is_empty() {
        return Err("tag names must be non-empty".into());
    }
    if !old_lc
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
        || !new_lc
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("tag names must be alphanumeric / - / _".into());
    }
    if old_lc == new_lc {
        return Ok(0);
    }
    let store = state.store.lock().unwrap();
    let all = store.all_notes().map_err(|e| e.to_string())?;
    let mut touched = 0u32;
    for note in all {
        if note.trashed_at.is_some() {
            continue;
        }
        let new_body = rewrite_tag_in_body(&note.body, &old_lc, &new_lc);
        if new_body != note.body {
            store
                .update(&note.id, None, Some(new_body))
                .map_err(|e| e.to_string())?;
            touched += 1;
        }
    }
    Ok(touched)
}

fn rewrite_tag_in_body(body: &str, old_lc: &str, new_lc: &str) -> String {
    let mut out = String::with_capacity(body.len());
    let bytes = body.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'#' && (i == 0 || !bytes[i - 1].is_ascii_alphanumeric()) {
            let start = i + 1;
            let mut end = start;
            while end < bytes.len()
                && (bytes[end].is_ascii_alphanumeric() || bytes[end] == b'_' || bytes[end] == b'-')
            {
                end += 1;
            }
            if end > start {
                let tag = &body[start..end];
                if tag.to_lowercase() == old_lc {
                    out.push('#');
                    out.push_str(new_lc);
                    i = end;
                    continue;
                }
            }
        }
        // Copy one UTF-8 char preserving multi-byte sequences.
        let ch = body[i..].chars().next().unwrap();
        out.push(ch);
        i += ch.len_utf8();
    }
    out
}

#[tauri::command]
fn backlinks(state: State<'_, AppState>, title: String) -> Result<Vec<NoteSummary>, String> {
    let needle = format!("[[{}]]", title);
    let notes = state
        .store
        .lock()
        .unwrap()
        .all_notes()
        .map_err(|e| e.to_string())?;
    let mut out: Vec<NoteSummary> = notes
        .iter()
        .filter(|n| n.trashed_at.is_none() && n.body.contains(&needle))
        .map(Store::summarize)
        .collect();
    out.sort_by_key(|b| std::cmp::Reverse(b.updated_at));
    Ok(out)
}

#[tauri::command]
fn export_note_md(state: State<'_, AppState>, id: String) -> Result<String, String> {
    let note = state
        .store
        .lock()
        .unwrap()
        .get(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "note not found".to_string())?;
    let title = if note.title.is_empty() {
        "Untitled".into()
    } else {
        note.title.clone()
    };
    let mut out = format!("# {}\n\n", title);
    if let Some(t) = note.updated_at {
        out.push_str(&format!("> Updated: {}\n\n", t.to_rfc3339()));
    }
    out.push_str(&note.body);
    if !out.ends_with('\n') {
        out.push('\n');
    }
    Ok(out)
}

#[tauri::command]
fn export_all_md(state: State<'_, AppState>) -> Result<Vec<(String, String)>, String> {
    let notes = state
        .store
        .lock()
        .unwrap()
        .all_notes()
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for note in notes {
        if note.trashed_at.is_some() {
            continue;
        }
        let title = if note.title.is_empty() {
            "Untitled".into()
        } else {
            note.title.clone()
        };
        let safe = title
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == ' ' {
                    c
                } else {
                    '_'
                }
            })
            .collect::<String>();
        let filename = format!("{}.md", safe.trim());
        let mut content = format!("# {}\n\n", title);
        if let Some(t) = note.updated_at {
            content.push_str(&format!("> Updated: {}\n\n", t.to_rfc3339()));
        }
        content.push_str(&note.body);
        if !content.ends_with('\n') {
            content.push('\n');
        }
        out.push((filename, content));
    }
    Ok(out)
}

#[tauri::command]
fn import_md(
    state: State<'_, AppState>,
    content: String,
    suggested_title: Option<String>,
) -> Result<Note, String> {
    let (title, body) = parse_imported_md(&content, suggested_title.as_deref());
    state
        .store
        .lock()
        .unwrap()
        .create(title, body)
        .map_err(|e| e.to_string())
}

fn parse_imported_md(content: &str, fallback_title: Option<&str>) -> (String, String) {
    let trimmed = content.trim_start_matches('\u{FEFF}');
    let mut lines = trimmed.lines();
    let mut title = String::new();
    let mut body_lines: Vec<&str> = vec![];
    let mut consumed_title = false;

    for line in lines.by_ref() {
        if !consumed_title {
            let t = line.trim();
            if t.is_empty() {
                continue;
            }
            if let Some(rest) = t.strip_prefix("# ") {
                title = rest.trim().to_string();
                consumed_title = true;
                continue;
            }
            title = t.to_string();
            consumed_title = true;
            continue;
        }
        body_lines.push(line);
    }

    if title.is_empty() {
        title = fallback_title.unwrap_or("Imported").to_string();
    }

    while body_lines
        .first()
        .map(|l| l.trim().is_empty())
        .unwrap_or(false)
    {
        body_lines.remove(0);
    }

    (title, body_lines.join("\n"))
}

#[tauri::command]
fn duplicate_note(state: State<'_, AppState>, id: String) -> Result<Note, String> {
    let store = state.store.lock().unwrap();
    let src = store
        .get(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "note not found".to_string())?;
    let new_title = if src.title.trim().is_empty() {
        "Untitled (copy)".to_string()
    } else {
        format!("{} (copy)", src.title)
    };
    store.create(new_title, src.body).map_err(|e| e.to_string())
}

#[tauri::command]
fn daily_note(state: State<'_, AppState>) -> Result<Note, String> {
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let store = state.store.lock().unwrap();
    let notes = store.all_notes().map_err(|e| e.to_string())?;
    if let Some(existing) = notes
        .into_iter()
        .find(|n| n.title == today && n.trashed_at.is_none())
    {
        return Ok(existing);
    }
    let title = today.clone();
    let body = format!("# {}\n\n- ", today);
    store.create(title, body).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Template {
    id: String,
    name: String,
    body: String,
    #[serde(default)]
    created_at: Option<DateTime<Utc>>,
}

fn templates_dir() -> PathBuf {
    data_root().join("templates")
}

#[tauri::command]
fn list_templates() -> Vec<Template> {
    let dir = templates_dir();
    let _ = fs::create_dir_all(&dir);
    let mut out = vec![];
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            if let Ok(b) = fs::read(&p) {
                if let Ok(t) = serde_json::from_slice::<Template>(&b) {
                    out.push(t);
                }
            }
        }
    }
    out.sort_by_key(|a| a.name.to_lowercase());
    out
}

#[tauri::command]
fn save_template(name: String, body: String) -> Result<Template, String> {
    if name.trim().is_empty() {
        return Err("template name empty".into());
    }
    let id = Ulid::new().to_string();
    let template = Template {
        id: id.clone(),
        name: name.trim().to_string(),
        body,
        created_at: Some(Utc::now()),
    };
    let dir = templates_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let p = dir.join(format!("{}.json", id));
    let tmp = p.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(&template).map_err(|e| e.to_string())?;
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &p).map_err(|e| e.to_string())?;
    Ok(template)
}

#[tauri::command]
fn delete_template(id: String) -> Result<(), String> {
    if id.is_empty() {
        return Err("id empty".into());
    }
    let p = templates_dir().join(format!("{}.json", id));
    if p.exists() {
        fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn note_from_template(
    state: State<'_, AppState>,
    template_id: String,
    title: Option<String>,
) -> Result<Note, String> {
    let p = templates_dir().join(format!("{}.json", template_id));
    let bytes = fs::read(&p).map_err(|e| e.to_string())?;
    let template: Template = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    let final_title = title.unwrap_or_else(|| template.name.clone());
    state
        .store
        .lock()
        .unwrap()
        .create(final_title, template.body)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn outline(state: State<'_, AppState>, id: String) -> Result<Vec<serde_json::Value>, String> {
    let note = state
        .store
        .lock()
        .unwrap()
        .get(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "note not found".to_string())?;
    let mut out = vec![];
    let mut line_no: u32 = 0;
    for line in note.body.lines() {
        line_no += 1;
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix('#') {
            let mut level = 1u32;
            let mut chars = rest.chars();
            while let Some('#') = chars.clone().next() {
                chars.next();
                level += 1;
                if level >= 6 {
                    break;
                }
            }
            let remaining: String = chars.collect();
            if let Some(stripped) = remaining.strip_prefix(' ') {
                out.push(serde_json::json!({
                    "level": level,
                    "title": stripped.trim().to_string(),
                    "line": line_no,
                }));
            }
        }
    }
    Ok(out)
}

#[tauri::command]
fn graph_data(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    check_unlocked(&state)?;
    let notes = state
        .store
        .lock()
        .unwrap()
        .all_notes()
        .map_err(|e| e.to_string())?;
    let mut title_to_id: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut nodes = vec![];
    for n in &notes {
        if n.trashed_at.is_some() {
            continue;
        }
        let title = if n.title.trim().is_empty() {
            "Untitled".into()
        } else {
            n.title.clone()
        };
        title_to_id.insert(title.to_lowercase(), n.id.clone());
        let body_len = n.body.len();
        nodes.push(serde_json::json!({
            "id": n.id,
            "title": title,
            "size": (body_len.min(20000) as f64 / 200.0).clamp(4.0, 20.0),
            "pinned": n.pinned,
            "tags": extract_tags(&n.body),
        }));
    }
    let mut edges = vec![];
    let re = regex_lite();
    for n in &notes {
        if n.trashed_at.is_some() {
            continue;
        }
        for cap in re.find_iter(&n.body) {
            let target_title = &n.body[cap.0 + 2..cap.1 - 2];
            let target = target_title.trim().to_lowercase();
            if let Some(target_id) = title_to_id.get(&target) {
                if &n.id != target_id {
                    edges.push(serde_json::json!({
                        "source": n.id,
                        "target": target_id,
                    }));
                }
            }
        }
    }
    Ok(serde_json::json!({
        "nodes": nodes,
        "edges": edges,
    }))
}

fn regex_lite() -> WikiLinkFinder {
    WikiLinkFinder
}

struct WikiLinkFinder;
impl WikiLinkFinder {
    fn find_iter<'a>(&self, s: &'a str) -> WikiLinkIter<'a> {
        WikiLinkIter { s, pos: 0 }
    }
}
struct WikiLinkIter<'a> {
    s: &'a str,
    pos: usize,
}
impl<'a> Iterator for WikiLinkIter<'a> {
    type Item = (usize, usize);
    fn next(&mut self) -> Option<(usize, usize)> {
        let bytes = self.s.as_bytes();
        while self.pos + 4 < bytes.len() {
            if bytes[self.pos] == b'[' && bytes[self.pos + 1] == b'[' {
                let start = self.pos;
                let mut end = self.pos + 2;
                while end + 1 < bytes.len() && !(bytes[end] == b']' && bytes[end + 1] == b']') {
                    if bytes[end] == b'\n' {
                        break;
                    }
                    end += 1;
                }
                if end + 1 < bytes.len() && bytes[end] == b']' && bytes[end + 1] == b']' {
                    self.pos = end + 2;
                    return Some((start, end + 2));
                }
            }
            self.pos += 1;
        }
        None
    }
}

#[tauri::command]
fn calendar_data(state: State<'_, AppState>) -> Result<Vec<(String, u32)>, String> {
    check_unlocked(&state)?;
    let notes = state
        .store
        .lock()
        .unwrap()
        .all_notes()
        .map_err(|e| e.to_string())?;
    let mut counts: std::collections::BTreeMap<String, u32> = std::collections::BTreeMap::new();
    for n in notes {
        if n.trashed_at.is_some() {
            continue;
        }
        if let Some(t) = n.updated_at {
            let day = t.format("%Y-%m-%d").to_string();
            *counts.entry(day).or_insert(0) += 1;
        }
    }
    Ok(counts.into_iter().collect())
}

#[tauri::command]
fn dashboard_stats(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    check_unlocked(&state)?;
    let notes = state
        .store
        .lock()
        .unwrap()
        .all_notes()
        .map_err(|e| e.to_string())?;
    let mut total_notes = 0u32;
    let mut total_words = 0u64;
    let mut total_chars = 0u64;
    let mut pinned_count = 0u32;
    let mut tag_counts: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    let mut links = 0u32;
    let mut earliest: Option<DateTime<Utc>> = None;
    let mut latest: Option<DateTime<Utc>> = None;
    for n in &notes {
        if n.trashed_at.is_some() {
            continue;
        }
        total_notes += 1;
        if n.pinned {
            pinned_count += 1;
        }
        let words = n.body.split_whitespace().filter(|w| !w.is_empty()).count();
        total_words += words as u64;
        total_chars += n.body.chars().count() as u64;
        for t in extract_tags(&n.body) {
            *tag_counts.entry(t).or_insert(0) += 1;
        }
        let finder = WikiLinkFinder;
        links += finder.find_iter(&n.body).count() as u32;
        if let Some(t) = n.created_at {
            earliest = Some(earliest.map(|e| e.min(t)).unwrap_or(t));
            latest = Some(latest.map(|e| e.max(t)).unwrap_or(t));
        }
    }
    let mut top_tags: Vec<(String, u32)> = tag_counts.into_iter().collect();
    top_tags.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    top_tags.truncate(10);
    Ok(serde_json::json!({
        "total_notes": total_notes,
        "total_words": total_words,
        "total_chars": total_chars,
        "pinned": pinned_count,
        "links": links,
        "top_tags": top_tags,
        "earliest": earliest,
        "latest": latest,
    }))
}

#[tauri::command]
fn note_stats(state: State<'_, AppState>, id: String) -> Result<serde_json::Value, String> {
    let note = state
        .store
        .lock()
        .unwrap()
        .get(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "note not found".to_string())?;
    let chars = note.body.chars().count();
    let words = note
        .body
        .split_whitespace()
        .filter(|w| !w.is_empty())
        .count();
    let read_minutes = ((words as f64) / 220.0).ceil().max(1.0) as u32;
    Ok(serde_json::json!({
        "chars": chars,
        "words": words,
        "read_minutes": read_minutes,
        "tags": extract_tags(&note.body),
    }))
}

fn history_dir(note_id: &str) -> PathBuf {
    data_root().join("history").join(note_id)
}

fn snapshot_filename(ts: DateTime<Utc>) -> String {
    format!("{}.json", ts.format("%Y%m%dT%H%M%S%3f"))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HistoryEntry {
    timestamp: DateTime<Utc>,
    title: String,
    body_preview: String,
    chars: usize,
}

#[tauri::command]
fn snapshot_note(state: State<'_, AppState>, id: String) -> Result<HistoryEntry, String> {
    let note = state
        .store
        .lock()
        .unwrap()
        .get(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "note not found".to_string())?;
    let now = Utc::now();
    let dir = history_dir(&id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let p = dir.join(snapshot_filename(now));
    let bytes = serde_json::to_vec_pretty(&note).map_err(|e| e.to_string())?;
    fs::write(&p, bytes).map_err(|e| e.to_string())?;
    let preview: String = note.body.chars().take(80).collect();
    Ok(HistoryEntry {
        timestamp: now,
        title: note.title,
        body_preview: preview,
        chars: note.body.chars().count(),
    })
}

#[tauri::command]
fn list_history(id: String) -> Result<Vec<HistoryEntry>, String> {
    let dir = history_dir(&id);
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut out = vec![];
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let p = entry.path();
        if p.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let bytes = match fs::read(&p) {
            Ok(b) => b,
            Err(_) => continue,
        };
        let note: Note = match serde_json::from_slice(&bytes) {
            Ok(n) => n,
            Err(_) => continue,
        };
        let stem = p
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();
        let ts = DateTime::parse_from_str(&format!("{} +0000", stem), "%Y%m%dT%H%M%S%3f %z")
            .map(|d| d.with_timezone(&Utc))
            .ok();
        let preview: String = note.body.chars().take(80).collect();
        out.push(HistoryEntry {
            timestamp: ts.unwrap_or_else(Utc::now),
            title: note.title,
            body_preview: preview,
            chars: note.body.chars().count(),
        });
    }
    out.sort_by_key(|e| std::cmp::Reverse(e.timestamp));
    Ok(out)
}

#[tauri::command]
fn restore_history(
    state: State<'_, AppState>,
    id: String,
    timestamp: String,
) -> Result<Note, String> {
    let dir = history_dir(&id);
    let p = dir.join(format!("{}.json", timestamp));
    if !p.exists() {
        return Err("snapshot not found".into());
    }
    let bytes = fs::read(&p).map_err(|e| e.to_string())?;
    let mut note: Note = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    note.updated_at = Some(Utc::now());
    state
        .store
        .lock()
        .unwrap()
        .write(&note)
        .map_err(|e| e.to_string())?;
    Ok(note)
}

#[tauri::command]
fn purge_history(id: String) -> Result<u32, String> {
    let dir = history_dir(&id);
    if !dir.exists() {
        return Ok(0);
    }
    let mut n = 0u32;
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
            let _ = fs::remove_file(entry.path());
            n += 1;
        }
    }
    Ok(n)
}

#[tauri::command]
fn export_workspace(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let store = state.store.lock().unwrap();
    let notes = store.all_notes().map_err(|e| e.to_string())?;
    let themes = list_themes();
    let templates = list_templates();
    let plugins = list_plugins();
    let settings = get_settings();
    Ok(serde_json::json!({
        "format": "mycelium-workspace-v1",
        "exported_at": Utc::now(),
        "version": env!("CARGO_PKG_VERSION"),
        "notes": notes,
        "themes": themes,
        "templates": templates,
        "plugins": plugins,
        "settings": settings,
    }))
}

#[derive(Debug, Deserialize)]
struct WorkspaceBundle {
    #[serde(default)]
    notes: Vec<Note>,
    #[serde(default)]
    themes: Vec<Theme>,
    #[serde(default)]
    templates: Vec<Template>,
}

#[tauri::command]
fn import_workspace(
    state: State<'_, AppState>,
    bundle: serde_json::Value,
    overwrite: bool,
) -> Result<serde_json::Value, String> {
    let parsed: WorkspaceBundle =
        serde_json::from_value(bundle).map_err(|e| format!("invalid bundle: {}", e))?;
    let store = state.store.lock().unwrap();
    let mut notes_imported = 0u32;
    let mut notes_skipped = 0u32;
    for note in parsed.notes {
        let existing = store.get(&note.id).ok().flatten();
        if existing.is_some() && !overwrite {
            notes_skipped += 1;
            continue;
        }
        store.write(&note).map_err(|e| e.to_string())?;
        notes_imported += 1;
    }
    let mut themes_imported = 0u32;
    for theme in parsed.themes {
        if theme.builtin {
            continue;
        }
        let _ = save_theme(theme);
        themes_imported += 1;
    }
    let mut templates_imported = 0u32;
    for template in parsed.templates {
        let _ = save_template(template.name, template.body);
        templates_imported += 1;
    }
    Ok(serde_json::json!({
        "notes_imported": notes_imported,
        "notes_skipped": notes_skipped,
        "themes_imported": themes_imported,
        "templates_imported": templates_imported,
    }))
}

#[tauri::command]
fn attachment_data_url(content: String, mime: String) -> Result<String, String> {
    if content.is_empty() {
        return Err("empty content".into());
    }
    if mime.is_empty() {
        return Err("empty mime".into());
    }
    Ok(format!("data:{};base64,{}", mime, content))
}

#[tauri::command]
fn app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "Mycelium",
        "version": env!("CARGO_PKG_VERSION"),
        "channel": "beta",
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SavedSearch {
    name: String,
    query: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Settings {
    #[serde(default = "default_true")]
    auto_check_updates: bool,
    #[serde(default)]
    last_update_check: Option<DateTime<Utc>>,
    #[serde(default = "default_theme")]
    theme: String,
    #[serde(default)]
    enabled_plugins: Vec<String>,
    #[serde(default)]
    default_preview: bool,
    #[serde(default = "default_true")]
    show_backlinks: bool,
    #[serde(default)]
    saved_searches: Vec<SavedSearch>,
    #[serde(default)]
    spell_check: bool,
    #[serde(default = "default_sort_by")]
    sort_by: String,
    #[serde(default)]
    lock: Option<LockConfig>,
    #[serde(default = "default_locale")]
    locale: String,
    #[serde(default = "default_true")]
    auto_pair: bool,
    #[serde(default = "default_true")]
    smart_lists: bool,
    #[serde(default)]
    strip_trailing_ws: bool,
    #[serde(default = "default_editor_font_size")]
    editor_font_size: u32,
    #[serde(default = "default_true")]
    word_wrap: bool,
    #[serde(default)]
    smart_typography: bool,
    #[serde(default = "default_board_property")]
    board_property: String,
    #[serde(default = "default_calendar_property")]
    calendar_property: String,
}

fn default_board_property() -> String {
    "status".to_string()
}
fn default_calendar_property() -> String {
    "due".to_string()
}

fn default_editor_font_size() -> u32 {
    15
}

fn default_locale() -> String {
    "en".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LockConfig {
    salt: String,
    verifier: String,
}

fn default_sort_by() -> String {
    "updated".to_string()
}

fn default_true() -> bool {
    true
}
fn default_theme() -> String {
    "dark".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            auto_check_updates: true,
            last_update_check: None,
            theme: "dark".to_string(),
            enabled_plugins: vec![],
            default_preview: false,
            show_backlinks: true,
            saved_searches: vec![],
            spell_check: false,
            sort_by: "updated".to_string(),
            lock: None,
            locale: "en".to_string(),
            auto_pair: true,
            smart_lists: true,
            strip_trailing_ws: false,
            editor_font_size: 15,
            word_wrap: true,
            smart_typography: false,
            board_property: "status".to_string(),
            calendar_property: "due".to_string(),
        }
    }
}

fn settings_path() -> PathBuf {
    data_root().join("settings.json")
}

#[tauri::command]
fn get_settings() -> Settings {
    let p = settings_path();
    fs::read(&p)
        .ok()
        .and_then(|b| serde_json::from_slice::<Settings>(&b).ok())
        .unwrap_or_default()
}

#[tauri::command]
fn set_settings(settings: Settings) -> Result<(), String> {
    let p = settings_path();
    if let Some(parent) = p.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let tmp = p.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &p).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Theme {
    id: String,
    name: String,
    #[serde(default)]
    author: Option<String>,
    #[serde(default)]
    builtin: bool,
    colors: serde_json::Map<String, serde_json::Value>,
    #[serde(default)]
    radii: serde_json::Map<String, serde_json::Value>,
    #[serde(default)]
    typography: serde_json::Map<String, serde_json::Value>,
}

fn themes_dir() -> PathBuf {
    data_root().join("themes")
}

#[tauri::command]
fn list_themes() -> Vec<Theme> {
    let dir = themes_dir();
    let _ = fs::create_dir_all(&dir);
    let mut out = vec![];
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            if let Ok(b) = fs::read(&p) {
                if let Ok(t) = serde_json::from_slice::<Theme>(&b) {
                    out.push(t);
                }
            }
        }
    }
    out.sort_by_key(|a| a.name.to_lowercase());
    out
}

#[tauri::command]
fn save_theme(theme: Theme) -> Result<(), String> {
    if theme.id.is_empty() {
        return Err("theme id empty".into());
    }
    if !theme
        .id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("theme id must be alphanumeric / - / _".into());
    }
    let dir = themes_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let p = dir.join(format!("{}.json", theme.id));
    let tmp = p.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(&theme).map_err(|e| e.to_string())?;
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &p).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_theme(id: String) -> Result<(), String> {
    if id.is_empty() {
        return Err("id empty".into());
    }
    let p = themes_dir().join(format!("{}.json", id));
    if p.exists() {
        fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PluginManifest {
    id: String,
    name: String,
    version: String,
    #[serde(default)]
    author: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    homepage: Option<String>,
    entry: String,
    #[serde(default)]
    permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Plugin {
    manifest: PluginManifest,
    code: String,
    #[serde(default)]
    installed_at: Option<DateTime<Utc>>,
}

fn plugins_dir() -> PathBuf {
    data_root().join("plugins")
}

#[tauri::command]
fn list_plugins() -> Vec<Plugin> {
    let dir = plugins_dir();
    let _ = fs::create_dir_all(&dir);
    let mut out = vec![];
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if !p.is_dir() {
                continue;
            }
            let mp = p.join("manifest.json");
            if !mp.exists() {
                continue;
            }
            let mb = match fs::read(&mp) {
                Ok(b) => b,
                Err(_) => continue,
            };
            let manifest: PluginManifest = match serde_json::from_slice(&mb) {
                Ok(m) => m,
                Err(_) => continue,
            };
            let entry_path = p.join(&manifest.entry);
            let code = fs::read_to_string(&entry_path).unwrap_or_default();
            let installed_at = fs::metadata(&mp)
                .ok()
                .and_then(|m| m.created().ok())
                .and_then(|t| DateTime::<Utc>::from(t).into());
            out.push(Plugin {
                manifest,
                code,
                installed_at,
            });
        }
    }
    out.sort_by_key(|a| a.manifest.name.to_lowercase());
    out
}

#[tauri::command]
fn install_plugin(manifest: PluginManifest, code: String) -> Result<(), String> {
    if manifest.id.is_empty() {
        return Err("plugin id empty".into());
    }
    if !manifest
        .id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("plugin id must be alphanumeric / - / _".into());
    }
    if manifest.entry.is_empty() {
        return Err("plugin entry empty".into());
    }
    let dir = plugins_dir().join(&manifest.id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let mp = dir.join("manifest.json");
    let mtmp = mp.with_extension("json.tmp");
    fs::write(
        &mtmp,
        serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(&mtmp, &mp).map_err(|e| e.to_string())?;
    let entry_path = dir.join(&manifest.entry);
    let etmp = entry_path.with_extension(format!(
        "{}.tmp",
        entry_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("js")
    ));
    fs::write(&etmp, code).map_err(|e| e.to_string())?;
    fs::rename(&etmp, &entry_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn uninstall_plugin(id: String) -> Result<(), String> {
    if id.is_empty() {
        return Err("id empty".into());
    }
    let dir = plugins_dir().join(&id);
    if dir.exists() {
        fs::remove_dir_all(dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_data_dir() -> Result<(), String> {
    let dir = data_root();
    let _ = fs::create_dir_all(&dir);
    #[cfg(windows)]
    {
        std::process::Command::new("explorer.exe")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn data_root() -> PathBuf {
    if let Ok(p) = std::env::var("MYCELIUM_DATA_DIR") {
        return PathBuf::from(p);
    }
    if let Some(d) = dirs::data_dir() {
        return d.join("Mycelium");
    }
    PathBuf::from(".mycelium-data")
}

fn ensure_dir(p: &Path) {
    let _ = fs::create_dir_all(p);
}

fn main() -> Result<()> {
    init_logging();
    info!(
        version = env!("CARGO_PKG_VERSION"),
        "mycelium_desktop starting"
    );

    let data_dir = data_root();
    ensure_dir(&data_dir);
    let notes_dir = data_dir.join("notes");
    let store = Store::new(notes_dir.clone()).context("init store")?;
    info!(?notes_dir, "notes store ready");

    let initial_unlocked = get_settings().lock.is_none();
    let state = AppState {
        store: Mutex::new(store),
        unlocked: Mutex::new(initial_unlocked),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            list_notes,
            get_note,
            create_note,
            update_note,
            delete_note,
            list_trash,
            restore_note,
            purge_note,
            empty_trash,
            set_pinned,
            set_note_order,
            reorder_pinned,
            bulk_set_pinned,
            bulk_trash,
            bulk_export_md,
            search_notes,
            all_tags,
            backlinks,
            outgoing_links,
            orphan_notes,
            rename_tag,
            note_properties,
            notes_by_property,
            all_property_keys,
            set_property,
            board_data,
            query_notes,
            month_calendar,
            resolve_link,
            all_aliases,
            suggested_notes,
            export_note_md,
            export_all_md,
            import_md,
            note_stats,
            duplicate_note,
            daily_note,
            list_templates,
            save_template,
            delete_template,
            note_from_template,
            outline,
            snapshot_note,
            list_history,
            restore_history,
            purge_history,
            export_workspace,
            import_workspace,
            attachment_data_url,
            lock_status,
            lock_set,
            lock_disable,
            lock_unlock,
            lock_now,
            graph_data,
            calendar_data,
            dashboard_stats,
            app_info,
            get_settings,
            set_settings,
            list_themes,
            save_theme,
            delete_theme,
            list_plugins,
            install_plugin,
            uninstall_plugin,
            open_data_dir,
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .context("Tauri run")?;

    Ok(())
}

fn init_logging() {
    use tracing_subscriber::prelude::*;
    let stderr = tracing_subscriber::fmt::layer().with_writer(std::io::stderr);
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with(stderr)
        .init();
}
