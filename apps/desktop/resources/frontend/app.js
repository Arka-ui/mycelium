const T = window.__TAURI__;
const invoke = (cmd, args) => T.core.invoke(cmd, args);
const checkUpdate = async () => {
  if (!T.updater) return null;
  return await T.updater.check();
};

const RELEASES_URL = 'https://github.com/Arka-ui/mycelium/releases';

const COLOR_KEYS = [
  ['--bg',         'Background'],
  ['--bg-2',       'Surface'],
  ['--bg-3',       'Elevated'],
  ['--border',     'Border'],
  ['--text',       'Text primary'],
  ['--text-2',     'Text secondary'],
  ['--text-3',     'Text muted'],
  ['--accent',     'Accent'],
  ['--accent-fg', 'Accent foreground'],
  ['--danger',     'Danger'],
];

const BUILTIN_THEMES = [
  {
    id: 'dark', name: 'Dark', builtin: true,
    colors: { '--bg':'#0e0f12','--bg-2':'#16181d','--bg-3':'#1d2026','--border':'#23262d','--text':'#e6e6e6','--text-2':'#a8aab0','--text-3':'#6f7177','--accent':'#7aa6ff','--accent-fg':'#0e0f12','--danger':'#ff7a7a' },
    radii: { '--radius':'10px','--radius-sm':'6px' },
    typography: { '--font-family':'-apple-system, "Segoe UI", Roboto, sans-serif','--font-size':'14px' }
  },
  {
    id: 'light', name: 'Light', builtin: true,
    colors: { '--bg':'#fafafa','--bg-2':'#ffffff','--bg-3':'#f0f1f3','--border':'#e0e2e7','--text':'#1c1d20','--text-2':'#5b5e66','--text-3':'#95979e','--accent':'#2a66e0','--accent-fg':'#ffffff','--danger':'#c83b3b' },
    radii: { '--radius':'10px','--radius-sm':'6px' },
    typography: { '--font-family':'-apple-system, "Segoe UI", Roboto, sans-serif','--font-size':'14px' }
  },
  {
    id: 'hc', name: 'High contrast', builtin: true,
    colors: { '--bg':'#000000','--bg-2':'#0a0a0a','--bg-3':'#161616','--border':'#ffffff','--text':'#ffffff','--text-2':'#f0f0f0','--text-3':'#c0c0c0','--accent':'#ffd400','--accent-fg':'#000000','--danger':'#ff5050' },
    radii: { '--radius':'8px','--radius-sm':'4px' },
    typography: { '--font-family':'-apple-system, "Segoe UI", Roboto, sans-serif','--font-size':'15px' }
  },
];

const els = {};
[
  'note-list','search','new-note','theme-btn','settings-btn','empty-state','editor','title','body','meta','save-state','delete-btn','status','version',
  'modal-backdrop','modal-close','opt-auto-update','check-update-btn','update-status','update-available','update-version','update-notes','install-update-btn','skip-update-btn','update-progress','bar-fill','bar-label','about-version','open-releases-btn',
  'active-theme-select','open-theme-editor-btn','open-data-btn','theme-list','new-theme-btn','import-theme-btn',
  'theme-editor','te-name','te-id','te-colors','te-radius','te-radius-sm','te-font','te-font-size','te-save-btn','te-export-btn','te-cancel-btn','te-delete-btn',
  'plugin-list','install-plugin-btn','open-plugins-folder-btn',
  'file-input',
].forEach(id => { els[toCamel(id)] = document.getElementById(id); });
function toCamel(s) { return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }

const state = {
  notes: [], activeId: null, active: null, pendingTimer: null, query: '',
  themes: [], activeThemeId: 'dark', editingTheme: null,
  plugins: [], pluginWorkers: new Map(), pluginCommands: new Map(),
  pendingUpdate: null,
  settings: { auto_check_updates: true, theme: 'dark', enabled_plugins: [] },
};

function setStatus(s) { els.status.textContent = s; }

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return d.toLocaleDateString();
}

function findTheme(id) {
  return state.themes.find(t => t.id === id) || BUILTIN_THEMES.find(t => t.id === id) || BUILTIN_THEMES[0];
}

function applyTheme(id) {
  const theme = findTheme(id);
  state.activeThemeId = theme.id;
  document.body.classList.remove('theme-dark', 'theme-light', 'theme-hc');
  document.body.style.cssText = '';
  const allVars = { ...(theme.colors || {}), ...(theme.radii || {}), ...(theme.typography || {}) };
  Object.entries(allVars).forEach(([k, v]) => {
    if (v != null && v !== '') document.body.style.setProperty(k, v);
  });
  if (theme.id === 'dark' || theme.id === 'light' || theme.id === 'hc') {
    document.body.classList.add('theme-' + theme.id);
  }
}

async function loadNotes() {
  try { state.notes = await invoke('list_notes'); renderList(); }
  catch (e) { setStatus('error: ' + e); console.error(e); }
}

function renderList() {
  const q = state.query.trim().toLowerCase();
  const items = q ? state.notes.filter(n => (n.title || '').toLowerCase().includes(q)) : state.notes;
  els.noteList.innerHTML = '';
  for (const n of items) {
    const li = document.createElement('li');
    if (n.id === state.activeId) li.classList.add('active');
    const t = document.createElement('span');
    t.className = 'nl-title';
    t.textContent = n.title && n.title.trim() ? n.title : 'Untitled';
    const time = document.createElement('span');
    time.className = 'nl-time';
    time.textContent = fmtDate(n.updated_at);
    li.appendChild(t); li.appendChild(time);
    li.addEventListener('click', () => openNote(n.id));
    els.noteList.appendChild(li);
  }
}

async function openNote(id) {
  if (state.pendingTimer) { clearTimeout(state.pendingTimer); await flushSave(); }
  const note = await invoke('get_note', { id });
  if (!note) { setStatus('note vanished'); await loadNotes(); showEmpty(); return; }
  state.activeId = id; state.active = note;
  els.emptyState.classList.add('hidden');
  els.editor.classList.remove('hidden');
  els.title.value = note.title || '';
  els.body.value = note.body || '';
  els.meta.textContent = 'Updated ' + fmtDate(note.updated_at);
  els.saveState.textContent = 'saved';
  renderList(); els.body.focus();
  emitToPlugins('note:opened', cloneNote(note));
}

function showEmpty() {
  state.activeId = null; state.active = null;
  els.editor.classList.add('hidden'); els.emptyState.classList.remove('hidden');
  renderList();
}

async function newNote() {
  try {
    if (state.pendingTimer) { clearTimeout(state.pendingTimer); await flushSave(); }
    const note = await invoke('create_note', { title: '', body: '' });
    await loadNotes(); await openNote(note.id); els.title.focus();
    emitToPlugins('note:created', cloneNote(note));
  } catch (e) { setStatus('create failed: ' + e); console.error(e); }
}

function cloneNote(n) {
  return { id: n.id, title: n.title, body: n.body, created_at: n.created_at, updated_at: n.updated_at };
}

async function flushSave() {
  if (!state.activeId) return;
  const id = state.activeId;
  const title = els.title.value;
  const body = els.body.value;
  els.saveState.textContent = 'saving...';
  try {
    const note = await invoke('update_note', { id, title, body });
    state.active = note;
    els.meta.textContent = 'Updated ' + fmtDate(note.updated_at);
    els.saveState.textContent = 'saved';
    const idx = state.notes.findIndex(n => n.id === id);
    if (idx >= 0) {
      state.notes[idx].title = note.title;
      state.notes[idx].updated_at = note.updated_at;
      state.notes.sort((a,b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    }
    renderList();
    emitToPlugins('note:saved', cloneNote(note));
  } catch (e) { els.saveState.textContent = 'save failed'; setStatus('save failed: ' + e); }
}

function scheduleSave() {
  els.saveState.textContent = 'editing...';
  if (state.pendingTimer) clearTimeout(state.pendingTimer);
  state.pendingTimer = setTimeout(() => { state.pendingTimer = null; flushSave(); }, 500);
}

async function deleteActive() {
  if (!state.activeId) return;
  if (!confirm('Delete this note? This cannot be undone.')) return;
  const id = state.activeId;
  if (state.pendingTimer) { clearTimeout(state.pendingTimer); state.pendingTimer = null; }
  try {
    await invoke('delete_note', { id });
    state.notes = state.notes.filter(n => n.id !== id);
    showEmpty();
    emitToPlugins('note:deleted', { id });
  } catch (e) { setStatus('delete failed: ' + e); }
}

function cycleTheme() {
  const all = [...BUILTIN_THEMES, ...state.themes];
  const i = all.findIndex(t => t.id === state.activeThemeId);
  const next = all[(i + 1) % all.length];
  applyTheme(next.id);
  state.settings.theme = next.id;
  invoke('set_settings', { settings: state.settings }).catch(()=>{});
  renderActiveThemeSelect();
}

function openSettings(tab) { els.modalBackdrop.classList.remove('hidden'); if (tab) switchTab(tab); }
function closeSettings() { els.modalBackdrop.classList.add('hidden'); }
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
}

async function loadSettings() {
  try {
    state.settings = await invoke('get_settings');
    if (!state.settings.enabled_plugins) state.settings.enabled_plugins = [];
    els.optAutoUpdate.checked = !!state.settings.auto_check_updates;
  } catch (e) { console.error(e); }
}

async function saveSettings() {
  state.settings.auto_check_updates = !!els.optAutoUpdate.checked;
  try { await invoke('set_settings', { settings: state.settings }); }
  catch (e) { console.error(e); }
}

async function loadThemes() {
  try { state.themes = await invoke('list_themes'); }
  catch (e) { state.themes = []; console.error(e); }
  renderThemeList();
  renderActiveThemeSelect();
}

function renderActiveThemeSelect() {
  const sel = els.activeThemeSelect;
  sel.innerHTML = '';
  const all = [...BUILTIN_THEMES, ...state.themes];
  for (const t of all) {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = t.name + (t.builtin ? '' : ' (custom)');
    if (t.id === state.activeThemeId) opt.selected = true;
    sel.appendChild(opt);
  }
}

function renderThemeList() {
  const ul = els.themeList; ul.innerHTML = '';
  const all = [...BUILTIN_THEMES, ...state.themes];
  for (const t of all) {
    const li = document.createElement('li');
    const main = document.createElement('div'); main.className = 'row-main';
    const name = document.createElement('div'); name.className = 'row-name';
    name.textContent = t.name;
    if (t.id === state.activeThemeId) {
      const b = document.createElement('span'); b.className = 'badge on'; b.textContent = 'active'; name.appendChild(b);
    }
    if (t.builtin) {
      const b = document.createElement('span'); b.className = 'badge'; b.textContent = 'built-in'; name.appendChild(b);
    }
    const sub = document.createElement('div'); sub.className = 'row-sub';
    sub.textContent = t.id + (t.author ? ' by ' + t.author : '');
    main.appendChild(name); main.appendChild(sub);
    const actions = document.createElement('div'); actions.className = 'row-actions';
    const useBtn = btn('ghost-btn', 'Use', () => { applyTheme(t.id); state.settings.theme = t.id; saveSettings(); renderThemeList(); renderActiveThemeSelect(); });
    actions.appendChild(useBtn);
    if (!t.builtin) {
      actions.appendChild(btn('ghost-btn', 'Edit', () => openThemeEditor(t)));
    } else {
      actions.appendChild(btn('ghost-btn', 'Duplicate', () => openThemeEditor(forkTheme(t))));
    }
    li.appendChild(main); li.appendChild(actions);
    ul.appendChild(li);
  }
}

function btn(cls, text, onClick) {
  const b = document.createElement('button'); b.className = cls; b.textContent = text;
  b.addEventListener('click', onClick); return b;
}

function forkTheme(src) {
  const id = (src.id + '-copy').replace(/[^a-z0-9_-]/gi, '');
  return { id, name: src.name + ' (copy)', author: '', builtin: false,
           colors: { ...src.colors }, radii: { ...(src.radii||{}) }, typography: { ...(src.typography||{}) } };
}

function blankTheme() {
  const base = BUILTIN_THEMES[0];
  return { id: '', name: 'New theme', author: '', builtin: false,
           colors: { ...base.colors }, radii: { ...base.radii }, typography: { ...base.typography } };
}

function openThemeEditor(theme) {
  state.editingTheme = theme;
  els.themeEditor.classList.remove('hidden');
  els.teName.value = theme.name || '';
  els.teId.value = theme.id || '';
  els.teRadius.value = (theme.radii && theme.radii['--radius']) || '';
  els.teRadiusSm.value = (theme.radii && theme.radii['--radius-sm']) || '';
  els.teFont.value = (theme.typography && theme.typography['--font-family']) || '';
  els.teFontSize.value = (theme.typography && theme.typography['--font-size']) || '';
  const cdiv = els.teColors; cdiv.innerHTML = '';
  for (const [key, label] of COLOR_KEYS) {
    const row = document.createElement('div'); row.className = 'color-row';
    const lab = document.createElement('label'); lab.textContent = label; lab.htmlFor = 'col-' + key.slice(2);
    const color = document.createElement('input'); color.type = 'color';
    const text = document.createElement('input'); text.type = 'text';
    const v = (theme.colors[key] || '#000000').toLowerCase();
    color.value = normalizeHex(v); color.id = 'col-' + key.slice(2);
    text.value = v;
    color.addEventListener('input', () => { text.value = color.value; updateThemePreview(key, color.value); });
    text.addEventListener('input', () => {
      const nv = text.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(nv)) { color.value = nv; updateThemePreview(key, nv); }
    });
    row.appendChild(lab); row.appendChild(color); row.appendChild(text);
    cdiv.appendChild(row);
  }
  els.teDeleteBtn.classList.toggle('hidden', !theme.id || theme.builtin);
  els.themeEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function normalizeHex(v) {
  if (!v) return '#000000';
  if (v.length === 4 && v[0] === '#') return '#' + v[1]+v[1]+v[2]+v[2]+v[3]+v[3];
  return v;
}

function updateThemePreview(key, value) {
  document.body.style.setProperty(key, value);
}

function readThemeFromEditor() {
  const colors = {};
  for (const [key] of COLOR_KEYS) {
    const text = document.querySelector('#col-' + key.slice(2)).nextElementSibling;
    colors[key] = text.value;
  }
  return {
    id: els.teId.value.trim(),
    name: els.teName.value.trim() || 'Untitled theme',
    author: state.editingTheme.author || '',
    builtin: false,
    colors,
    radii: { '--radius': els.teRadius.value || '10px', '--radius-sm': els.teRadiusSm.value || '6px' },
    typography: { '--font-family': els.teFont.value || '-apple-system, sans-serif', '--font-size': els.teFontSize.value || '14px' },
  };
}

async function saveThemeFromEditor() {
  const t = readThemeFromEditor();
  if (!t.id) { alert('Theme ID is required'); return; }
  if (!/^[a-z0-9_-]+$/i.test(t.id)) { alert('Theme ID must be alphanumeric / - / _'); return; }
  try {
    await invoke('save_theme', { theme: t });
    state.editingTheme = null;
    els.themeEditor.classList.add('hidden');
    await loadThemes();
    applyTheme(t.id); state.settings.theme = t.id; saveSettings();
    renderThemeList(); renderActiveThemeSelect();
  } catch (e) { alert('Save failed: ' + e); console.error(e); }
}

function exportThemeFromEditor() {
  const t = readThemeFromEditor();
  downloadJson(`mycelium-theme-${t.id || 'untitled'}.json`, t);
}

async function deleteEditingTheme() {
  if (!state.editingTheme || !state.editingTheme.id || state.editingTheme.builtin) return;
  if (!confirm('Delete theme "' + state.editingTheme.name + '"?')) return;
  try {
    await invoke('delete_theme', { id: state.editingTheme.id });
    state.editingTheme = null;
    els.themeEditor.classList.add('hidden');
    await loadThemes();
    if (state.settings.theme === state.activeThemeId && !findTheme(state.settings.theme)) {
      applyTheme('dark'); state.settings.theme = 'dark'; saveSettings();
    }
    renderThemeList(); renderActiveThemeSelect();
  } catch (e) { alert('Delete failed: ' + e); }
}

function downloadJson(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function pickJsonFile() {
  return new Promise((resolve) => {
    els.fileInput.value = '';
    els.fileInput.onchange = async () => {
      const f = els.fileInput.files && els.fileInput.files[0];
      if (!f) return resolve(null);
      try { const text = await f.text(); resolve({ name: f.name, json: JSON.parse(text), text }); }
      catch (e) { alert('Invalid JSON: ' + e.message); resolve(null); }
    };
    els.fileInput.click();
  });
}

async function importTheme() {
  const r = await pickJsonFile(); if (!r) return;
  const t = r.json;
  if (!t.id || !t.colors) { alert('Not a valid theme JSON (need id + colors)'); return; }
  t.builtin = false;
  try { await invoke('save_theme', { theme: t }); await loadThemes(); alert('Theme imported.'); }
  catch (e) { alert('Import failed: ' + e); }
}

async function loadPlugins() {
  try { state.plugins = await invoke('list_plugins'); }
  catch (e) { state.plugins = []; console.error(e); }
  renderPluginList();
  startEnabledPlugins();
}

function renderPluginList() {
  const ul = els.pluginList; ul.innerHTML = '';
  if (state.plugins.length === 0) {
    const li = document.createElement('li');
    li.style.background = 'transparent'; li.style.color = 'var(--text-3)';
    li.style.fontSize = '12.5px'; li.style.padding = '8px 0';
    li.textContent = 'No plugins installed yet. Drop a plugin JSON file or browse the docs above.';
    ul.appendChild(li); return;
  }
  for (const p of state.plugins) {
    const li = document.createElement('li');
    const main = document.createElement('div'); main.className = 'row-main';
    const name = document.createElement('div'); name.className = 'row-name';
    name.textContent = p.manifest.name + ' ';
    const ver = document.createElement('span'); ver.className = 'badge'; ver.textContent = 'v' + p.manifest.version;
    name.appendChild(ver);
    if (state.settings.enabled_plugins.includes(p.manifest.id)) {
      const e = document.createElement('span'); e.className = 'badge on'; e.textContent = 'on'; name.appendChild(e);
    }
    const sub = document.createElement('div'); sub.className = 'row-sub';
    sub.textContent = (p.manifest.description || p.manifest.id) + (p.manifest.author ? ' by ' + p.manifest.author : '');
    main.appendChild(name); main.appendChild(sub);
    const actions = document.createElement('div'); actions.className = 'row-actions';
    const enabled = state.settings.enabled_plugins.includes(p.manifest.id);
    actions.appendChild(btn('ghost-btn', enabled ? 'Disable' : 'Enable', () => togglePlugin(p, !enabled)));
    actions.appendChild(btn('danger-btn', 'Uninstall', () => uninstallPlugin(p)));
    li.appendChild(main); li.appendChild(actions);
    ul.appendChild(li);
  }
}

async function togglePlugin(p, enable) {
  const set = new Set(state.settings.enabled_plugins);
  if (enable) set.add(p.manifest.id); else set.delete(p.manifest.id);
  state.settings.enabled_plugins = Array.from(set);
  await saveSettings();
  if (enable) startPlugin(p); else stopPlugin(p.manifest.id);
  renderPluginList();
}

async function uninstallPlugin(p) {
  if (!confirm('Uninstall plugin "' + p.manifest.name + '"?')) return;
  stopPlugin(p.manifest.id);
  try {
    await invoke('uninstall_plugin', { id: p.manifest.id });
    state.settings.enabled_plugins = state.settings.enabled_plugins.filter(id => id !== p.manifest.id);
    await saveSettings();
    await loadPlugins();
  } catch (e) { alert('Uninstall failed: ' + e); }
}

async function installPluginFromFile() {
  const r = await pickJsonFile(); if (!r) return;
  const j = r.json;
  if (!j.manifest || !j.code) {
    if (j.id && j.entry) { alert('Plugin JSON should be an export bundle: { manifest: {...}, code: "..." }'); return; }
    alert('Not a valid plugin bundle'); return;
  }
  try {
    await invoke('install_plugin', { manifest: j.manifest, code: j.code });
    await loadPlugins();
    alert('Plugin "' + j.manifest.name + '" installed.');
  } catch (e) { alert('Install failed: ' + e); }
}

const PLUGIN_BOOTSTRAP = `
let _handlers = {}, _commands = {};
self.mycelium = {
  on(event, fn) { (_handlers[event] = _handlers[event] || []).push(fn); },
  command(name, fn) { _commands[name] = fn; postMessage({ type: 'command:registered', name }); },
  log(...args) { postMessage({ type: 'log', args: args.map(a => typeof a === 'string' ? a : JSON.stringify(a)) }); },
};
self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'event') {
    (_handlers[m.event] || []).forEach(fn => { try { fn(m.payload); } catch (err) { postMessage({ type: 'error', message: String(err) }); } });
  } else if (m.type === 'command') {
    const fn = _commands[m.name];
    if (!fn) return postMessage({ type: 'command:result', id: m.id, error: 'unknown command' });
    try {
      const r = fn(m.ctx);
      Promise.resolve(r).then(res => postMessage({ type: 'command:result', id: m.id, result: res }))
        .catch(err => postMessage({ type: 'command:result', id: m.id, error: String(err) }));
    } catch (err) { postMessage({ type: 'command:result', id: m.id, error: String(err) }); }
  }
};
`;

function startEnabledPlugins() {
  for (const p of state.plugins) {
    if (state.settings.enabled_plugins.includes(p.manifest.id)) startPlugin(p);
  }
}

function startPlugin(p) {
  if (state.pluginWorkers.has(p.manifest.id)) return;
  try {
    const blob = new Blob([PLUGIN_BOOTSTRAP + '\n;(function(){\n' + p.code + '\n})();'], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'log') console.log('[plugin ' + p.manifest.id + ']', ...m.args);
      else if (m.type === 'error') console.error('[plugin ' + p.manifest.id + ']', m.message);
      else if (m.type === 'command:registered') {
        state.pluginCommands.set(m.name, p.manifest.id);
      }
    };
    worker.onerror = (e) => { console.error('[plugin ' + p.manifest.id + '] worker error', e.message); };
    state.pluginWorkers.set(p.manifest.id, worker);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) { console.error('failed to start plugin ' + p.manifest.id, e); }
}

function stopPlugin(id) {
  const w = state.pluginWorkers.get(id);
  if (w) { try { w.terminate(); } catch (e) {} state.pluginWorkers.delete(id); }
  for (const [name, owner] of state.pluginCommands.entries()) {
    if (owner === id) state.pluginCommands.delete(name);
  }
}

function emitToPlugins(event, payload) {
  for (const w of state.pluginWorkers.values()) {
    try { w.postMessage({ type: 'event', event, payload }); } catch (e) {}
  }
}

async function checkForUpdates(quiet) {
  if (!T.updater) {
    if (!quiet) els.updateStatus.textContent = 'Updater unavailable in this build.';
    return;
  }
  els.updateStatus.textContent = quiet ? '' : 'Checking...';
  els.checkUpdateBtn.disabled = true;
  try {
    const u = await checkUpdate();
    state.settings.last_update_check = new Date().toISOString();
    saveSettings();
    if (u && u.available) {
      state.pendingUpdate = u;
      els.updateAvailable.classList.remove('hidden');
      els.updateVersion.textContent = 'v' + u.version;
      els.updateNotes.textContent = (u.body || '').trim() || '(no release notes)';
      els.updateStatus.textContent = '';
      setStatus('update available: v' + u.version);
    } else {
      state.pendingUpdate = null;
      els.updateAvailable.classList.add('hidden');
      els.updateStatus.textContent = 'You are on the latest version.';
      if (quiet) setTimeout(()=>{ els.updateStatus.textContent=''; }, 4000);
    }
  } catch (e) {
    const msg = String(e || '');
    if (quiet) { els.updateStatus.textContent = ''; }
    else { els.updateStatus.textContent = 'Cannot reach update server. Use "View releases on GitHub" to check manually.'; }
    console.warn('update check failed:', msg);
  } finally { els.checkUpdateBtn.disabled = false; }
}

async function installUpdate() {
  if (!state.pendingUpdate) return;
  els.installUpdateBtn.disabled = true; els.skipUpdateBtn.disabled = true;
  els.updateProgress.classList.remove('hidden');
  let total = 0, downloaded = 0;
  try {
    await state.pendingUpdate.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          total = event.data.contentLength || 0;
          els.barLabel.textContent = total ? ('Downloading 0 / ' + Math.round(total/1024) + ' KB') : 'Downloading...';
          break;
        case 'Progress':
          downloaded += event.data.chunkLength;
          if (total) {
            const pct = Math.min(100, (downloaded / total) * 100);
            els.barFill.style.width = pct.toFixed(1) + '%';
            els.barLabel.textContent = 'Downloading ' + Math.round(downloaded/1024) + ' / ' + Math.round(total/1024) + ' KB';
          }
          break;
        case 'Finished':
          els.barFill.style.width = '100%'; els.barLabel.textContent = 'Installing...'; break;
      }
    });
    els.barLabel.textContent = 'Restarting...';
    await T.process.relaunch();
  } catch (e) {
    els.updateStatus.textContent = 'Install failed: ' + e;
    els.installUpdateBtn.disabled = false; els.skipUpdateBtn.disabled = false;
    console.error(e);
  }
}

function skipUpdate() {
  state.pendingUpdate = null;
  els.updateAvailable.classList.add('hidden');
  els.updateStatus.textContent = '';
}

function openReleasesPage() {
  try { window.open(RELEASES_URL, '_blank', 'noopener'); }
  catch (e) { setStatus('Could not open browser; URL: ' + RELEASES_URL); }
}

document.addEventListener('keydown', (e) => {
  const target = e.target;
  const inField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); newNote(); }
  else if (e.ctrlKey && e.key === 's') { e.preventDefault();
    if (state.pendingTimer) clearTimeout(state.pendingTimer); state.pendingTimer = null; flushSave();
  }
  else if (e.ctrlKey && e.key === ',') { e.preventDefault(); cycleTheme(); }
  else if (e.key === '/' && !inField) { e.preventDefault(); els.search.focus(); }
  else if (e.key === 'Escape') {
    if (!els.modalBackdrop.classList.contains('hidden')) { closeSettings(); return; }
    if (target === els.search) { els.search.value = ''; state.query = ''; renderList(); els.search.blur(); }
  }
});

els.newNote.addEventListener('click', newNote);
els.themeBtn.addEventListener('click', cycleTheme);
els.deleteBtn.addEventListener('click', deleteActive);
els.title.addEventListener('input', scheduleSave);
els.body.addEventListener('input', scheduleSave);
els.search.addEventListener('input', () => { state.query = els.search.value; renderList(); });
els.settingsBtn.addEventListener('click', () => openSettings('general'));
els.modalClose.addEventListener('click', closeSettings);
els.modalBackdrop.addEventListener('click', (e) => { if (e.target === els.modalBackdrop) closeSettings(); });
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
els.optAutoUpdate.addEventListener('change', saveSettings);
els.checkUpdateBtn.addEventListener('click', () => checkForUpdates(false));
els.installUpdateBtn.addEventListener('click', installUpdate);
els.skipUpdateBtn.addEventListener('click', skipUpdate);
els.openReleasesBtn.addEventListener('click', openReleasesPage);

els.activeThemeSelect.addEventListener('change', () => {
  const id = els.activeThemeSelect.value; applyTheme(id);
  state.settings.theme = id; saveSettings(); renderThemeList();
});
els.openThemeEditorBtn.addEventListener('click', () => switchTab('themes'));
els.openDataBtn.addEventListener('click', () => invoke('open_data_dir').catch(e => alert('Open failed: ' + e)));
els.newThemeBtn.addEventListener('click', () => openThemeEditor(blankTheme()));
els.importThemeBtn.addEventListener('click', importTheme);
els.teSaveBtn.addEventListener('click', saveThemeFromEditor);
els.teExportBtn.addEventListener('click', exportThemeFromEditor);
els.teCancelBtn.addEventListener('click', () => { els.themeEditor.classList.add('hidden'); state.editingTheme = null; applyTheme(state.activeThemeId); });
els.teDeleteBtn.addEventListener('click', deleteEditingTheme);

els.installPluginBtn.addEventListener('click', installPluginFromFile);
els.openPluginsFolderBtn.addEventListener('click', () => invoke('open_data_dir').catch(()=>{}));

window.addEventListener('beforeunload', () => {
  if (state.pendingTimer) { clearTimeout(state.pendingTimer); flushSave(); }
  for (const w of state.pluginWorkers.values()) { try { w.terminate(); } catch (e) {} }
});

(async () => {
  if (!T) {
    document.body.innerHTML = '<div style="padding:32px;color:#e6e6e6;background:#0e0f12;font-family:sans-serif">Tauri runtime not available. Please re-install.</div>';
    return;
  }
  await loadSettings();
  await loadThemes();
  applyTheme(state.settings.theme || 'dark');
  renderThemeList(); renderActiveThemeSelect();
  await loadPlugins();
  try {
    const info = await invoke('app_info');
    els.version.textContent = 'v' + info.version;
    els.aboutVersion.textContent = 'v' + info.version;
  } catch (e) { els.version.textContent = ''; }
  await loadNotes();
  setStatus('ready');
  if (state.settings.auto_check_updates) {
    setTimeout(() => checkForUpdates(true), 2500);
  }
})();
