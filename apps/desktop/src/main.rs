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
}

fn default_schema_ver() -> u32 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct NoteSummary {
    id: String,
    title: String,
    updated_at: Option<DateTime<Utc>>,
}

struct Store {
    root: PathBuf,
}

impl Store {
    fn new(root: PathBuf) -> Result<Self> {
        fs::create_dir_all(&root).context("create notes dir")?;
        Ok(Store { root })
    }

    fn note_path(&self, id: &str) -> PathBuf {
        self.root.join(format!("{}.json", id))
    }

    fn list(&self) -> Result<Vec<NoteSummary>> {
        let mut out = vec![];
        for entry in fs::read_dir(&self.root)? {
            let entry = entry?;
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
            out.push(NoteSummary {
                id: note.id,
                title: note.title,
                updated_at: note.updated_at,
            });
        }
        out.sort_by_key(|b| std::cmp::Reverse(b.updated_at));
        Ok(out)
    }

    fn get(&self, id: &str) -> Result<Option<Note>> {
        let p = self.note_path(id);
        if !p.exists() {
            return Ok(None);
        }
        let bytes = fs::read(&p)?;
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
            schema_ver: 1,
        };
        self.write(&note)?;
        Ok(note)
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

    fn delete(&self, id: &str) -> Result<()> {
        let p = self.note_path(id);
        if p.exists() {
            fs::remove_file(p)?;
        }
        Ok(())
    }

    fn write(&self, note: &Note) -> Result<()> {
        let p = self.note_path(&note.id);
        let tmp = p.with_extension("json.tmp");
        let bytes = serde_json::to_vec_pretty(note)?;
        fs::write(&tmp, bytes)?;
        fs::rename(&tmp, &p)?;
        Ok(())
    }
}

struct AppState {
    store: Mutex<Store>,
}

#[tauri::command]
fn list_notes(state: State<'_, AppState>) -> Result<Vec<NoteSummary>, String> {
    state
        .store
        .lock()
        .unwrap()
        .list()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_note(state: State<'_, AppState>, id: String) -> Result<Option<Note>, String> {
    state
        .store
        .lock()
        .unwrap()
        .get(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_note(state: State<'_, AppState>, title: String, body: String) -> Result<Note, String> {
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
        .delete(&id)
        .map_err(|e| e.to_string())
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
struct Settings {
    #[serde(default = "default_true")]
    auto_check_updates: bool,
    #[serde(default)]
    last_update_check: Option<DateTime<Utc>>,
    #[serde(default = "default_theme")]
    theme: String,
    #[serde(default)]
    enabled_plugins: Vec<String>,
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

    let state = AppState {
        store: Mutex::new(store),
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
