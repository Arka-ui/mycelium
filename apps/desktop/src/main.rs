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
}

fn default_schema_ver() -> u32 {
    2
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
}

impl Store {
    fn new(root: PathBuf) -> Result<Self> {
        fs::create_dir_all(&root).context("create notes dir")?;
        Ok(Store { root })
    }

    fn note_path(&self, id: &str) -> PathBuf {
        self.root.join(format!("{}.json", id))
    }

    fn all_notes(&self) -> Result<Vec<Note>> {
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
        }
    }

    fn list(&self) -> Result<Vec<NoteSummary>> {
        let mut out: Vec<NoteSummary> = self
            .all_notes()?
            .iter()
            .filter(|n| n.trashed_at.is_none())
            .map(Self::summarize)
            .collect();
        out.sort_by(|a, b| {
            b.pinned
                .cmp(&a.pinned)
                .then_with(|| b.updated_at.cmp(&a.updated_at))
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
            schema_ver: 2,
            pinned: false,
            trashed_at: None,
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
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
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
            list_trash,
            restore_note,
            purge_note,
            empty_trash,
            set_pinned,
            search_notes,
            all_tags,
            backlinks,
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
