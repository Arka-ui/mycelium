const T = window.__TAURI__;
const invoke = (cmd, args) => T.core.invoke(cmd, args);
const checkUpdate = async () => (T.updater ? await T.updater.check() : null);
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
  { id: 'dark', name: 'Dark', builtin: true,
    colors: { '--bg':'#0e0f12','--bg-2':'#16181d','--bg-3':'#1d2026','--border':'#23262d','--text':'#e6e6e6','--text-2':'#a8aab0','--text-3':'#6f7177','--accent':'#7aa6ff','--accent-fg':'#0e0f12','--danger':'#ff7a7a' },
    radii: { '--radius':'10px','--radius-sm':'6px' },
    typography: { '--font-family':'-apple-system, "Segoe UI", Roboto, sans-serif','--font-size':'14px' } },
  { id: 'light', name: 'Light', builtin: true,
    colors: { '--bg':'#fafafa','--bg-2':'#ffffff','--bg-3':'#f0f1f3','--border':'#e0e2e7','--text':'#1c1d20','--text-2':'#5b5e66','--text-3':'#95979e','--accent':'#2a66e0','--accent-fg':'#ffffff','--danger':'#c83b3b' },
    radii: { '--radius':'10px','--radius-sm':'6px' },
    typography: { '--font-family':'-apple-system, "Segoe UI", Roboto, sans-serif','--font-size':'14px' } },
  { id: 'hc', name: 'High contrast', builtin: true,
    colors: { '--bg':'#000000','--bg-2':'#0a0a0a','--bg-3':'#161616','--border':'#ffffff','--text':'#ffffff','--text-2':'#f0f0f0','--text-3':'#c0c0c0','--accent':'#ffd400','--accent-fg':'#000000','--danger':'#ff5050' },
    radii: { '--radius':'8px','--radius-sm':'4px' },
    typography: { '--font-family':'-apple-system, "Segoe UI", Roboto, sans-serif','--font-size':'15px' } },
];

const els = {};
[
  'note-list','search','new-note','theme-btn','settings-btn','cmd-btn','empty-state','editor','title','body','meta','save-state','delete-btn','pin-btn','preview-btn','export-btn','status','version',
  'preview','tag-bar','view-all','view-trash','trash-pane','trash-list','empty-trash-btn',
  'outline-panel','outline-list','outline-btn','new-from-template','template-list','save-template-btn','template-menu','ctx-menu',
  'history-btn','history-modal','hm-close','history-list','hm-purge-btn',
  'attach-btn','attach-input','export-workspace-btn','import-workspace-btn',
  'saved-searches','save-search-btn',
  'opt-spell-check','opt-sort','sel-toolbar','cheatsheet-modal','cs-close',
  'lock-screen','lock-pass','lock-unlock-btn','lock-error','lock-state-text','lock-controls',
  'backlinks-panel','backlinks-list','stat-words','stat-chars','stat-read',
  'modal-backdrop','modal-close','opt-auto-update','opt-default-preview','opt-show-backlinks','check-update-btn','update-status','update-available','update-version','update-notes','install-update-btn','skip-update-btn','update-progress','bar-fill','bar-label','about-version','open-releases-btn',
  'active-theme-select','open-theme-editor-btn','open-data-btn','theme-list','new-theme-btn','import-theme-btn',
  'theme-editor','te-name','te-id','te-colors','te-radius','te-radius-sm','te-font','te-font-size','te-save-btn','te-export-btn','te-cancel-btn','te-delete-btn',
  'plugin-list','install-plugin-btn','open-plugins-folder-btn',
  'import-md-btn','export-all-btn',
  'cmd-palette','cmd-input','cmd-results',
  'file-input',
].forEach(id => { els[toCamel(id)] = document.getElementById(id); });
function toCamel(s) { return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }

const state = {
  notes: [], activeId: null, active: null, pendingTimer: null,
  query: '', activeTag: null, view: 'all', preview: false,
  outlineOpen: false, templates: [],
  themes: [], activeThemeId: 'dark', editingTheme: null,
  plugins: [], pluginWorkers: new Map(), pluginCommands: new Map(),
  pendingUpdate: null,
  settings: { auto_check_updates: true, theme: 'dark', enabled_plugins: [], default_preview: false, show_backlinks: true },
  palette: { open: false, items: [], cursor: 0 },
};

const THEMES = ['dark', 'light', 'hc'];

function setStatus(s) { els.status.textContent = s; }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (new Date() - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return d.toLocaleDateString();
}

function findTheme(id) {
  return state.themes.find(t => t.id === id) || BUILTIN_THEMES.find(t => t.id === id) || BUILTIN_THEMES[0];
}
function applyTheme(id) {
  const t = findTheme(id);
  state.activeThemeId = t.id;
  document.body.classList.remove('theme-dark','theme-light','theme-hc');
  document.body.style.cssText = '';
  const all = { ...(t.colors||{}), ...(t.radii||{}), ...(t.typography||{}) };
  Object.entries(all).forEach(([k,v]) => { if (v) document.body.style.setProperty(k, v); });
  if (['dark','light','hc'].includes(t.id)) document.body.classList.add('theme-' + t.id);
}

async function loadNotes() {
  try {
    if (state.query.trim()) {
      state.notes = await invoke('search_notes', { query: state.query.trim() });
    } else {
      state.notes = await invoke('list_notes');
    }
    renderList();
    renderTagBar();
  } catch (e) { setStatus('error: ' + e); console.error(e); }
}

function renderList() {
  let items = state.notes;
  if (state.activeTag) {
    items = items.filter(n => (n.tags || []).includes(state.activeTag));
  }
  if (!state.query.trim()) items = sortNotes(items);
  els.noteList.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.style.color = 'var(--text-3)'; li.style.fontSize = '12.5px'; li.style.padding = '14px 10px';
    li.textContent = state.query ? 'No matches.' : state.activeTag ? 'No notes with #' + state.activeTag : 'No notes yet. Click "+ New note".';
    els.noteList.appendChild(li);
    return;
  }
  for (const n of items) {
    const li = document.createElement('li');
    if (n.id === state.activeId) li.classList.add('active');
    if (n.pinned) li.classList.add('pinned');

    const titleRow = document.createElement('div'); titleRow.className = 'nl-row-title';
    const t = document.createElement('span'); t.className = 'nl-title';
    t.textContent = n.title && n.title.trim() ? n.title : 'Untitled';
    if (n.pinned) {
      const star = document.createElement('span'); star.className = 'nl-pin'; star.textContent = '★';
      titleRow.appendChild(star);
    }
    titleRow.appendChild(t);
    li.appendChild(titleRow);

    if (n.snippet && n.match_in_body) {
      const snip = document.createElement('div'); snip.className = 'nl-snippet';
      snip.textContent = n.snippet;
      li.appendChild(snip);
    }

    const sub = document.createElement('div'); sub.className = 'nl-sub';
    const time = document.createElement('span'); time.className = 'nl-time';
    time.textContent = fmtDate(n.updated_at);
    sub.appendChild(time);
    if ((n.tags || []).length) {
      const tagWrap = document.createElement('span'); tagWrap.className = 'nl-tags';
      for (const tag of n.tags.slice(0, 3)) {
        const sp = document.createElement('span'); sp.className = 'nl-tag'; sp.textContent = '#' + tag;
        tagWrap.appendChild(sp);
      }
      sub.appendChild(tagWrap);
    }
    li.appendChild(sub);

    li.addEventListener('click', () => openNote(n.id));
    els.noteList.appendChild(li);
  }
}

async function renderTagBar() {
  try {
    const tags = await invoke('all_tags');
    if (!tags.length) { els.tagBar.classList.add('hidden'); els.tagBar.innerHTML = ''; return; }
    els.tagBar.classList.remove('hidden');
    els.tagBar.innerHTML = '';
    const all = document.createElement('button');
    all.className = 'tag-chip' + (state.activeTag === null ? ' on' : '');
    all.textContent = 'All';
    all.addEventListener('click', () => { state.activeTag = null; renderList(); renderTagBar(); });
    els.tagBar.appendChild(all);
    for (const [tag, count] of tags) {
      const b = document.createElement('button');
      b.className = 'tag-chip' + (state.activeTag === tag ? ' on' : '');
      b.textContent = '#' + tag + ' ' + count;
      b.addEventListener('click', () => { state.activeTag = state.activeTag === tag ? null : tag; renderList(); renderTagBar(); });
      els.tagBar.appendChild(b);
    }
  } catch (e) { console.error(e); }
}

async function openNote(id) {
  if (state.pendingTimer) { clearTimeout(state.pendingTimer); await flushSave(); }
  const note = await invoke('get_note', { id });
  if (!note) { setStatus('note vanished'); await loadNotes(); showEmpty(); return; }
  state.activeId = id; state.active = note;
  showView('editor');
  els.title.value = note.title || '';
  els.body.value = note.body || '';
  els.meta.textContent = (note.pinned ? 'Pinned · ' : '') + 'Updated ' + fmtDate(note.updated_at);
  els.pinBtn.classList.toggle('on', !!note.pinned);
  els.pinBtn.title = note.pinned ? 'Unpin' : 'Pin to top';
  els.saveState.textContent = 'saved';
  if (state.settings.default_preview) { state.preview = true; updatePreviewUI(); }
  else { state.preview = false; updatePreviewUI(); }
  refreshStats();
  refreshBacklinks();
  refreshOutline();
  renderList();
  emitToPlugins('note:opened', cloneNote(note));
}

function showView(name) {
  const showEditor = name === 'editor';
  const showTrash = name === 'trash';
  const showEmpty = name === 'empty';
  els.editor.classList.toggle('hidden', !showEditor);
  els.trashPane.classList.toggle('hidden', !showTrash);
  els.emptyState.classList.toggle('hidden', !showEmpty);
}
function showEmpty() {
  state.activeId = null; state.active = null;
  showView('empty');
}

async function newNote() {
  try {
    if (state.pendingTimer) { clearTimeout(state.pendingTimer); await flushSave(); }
    const note = await invoke('create_note', { title: '', body: '' });
    await loadNotes(); await openNote(note.id); els.title.focus();
    emitToPlugins('note:created', cloneNote(note));
  } catch (e) { setStatus('create failed: ' + e); console.error(e); }
}

function cloneNote(n) { return { id: n.id, title: n.title, body: n.body, created_at: n.created_at, updated_at: n.updated_at, pinned: n.pinned }; }

async function flushSave() {
  if (!state.activeId) return;
  const id = state.activeId;
  const title = els.title.value; const body = els.body.value;
  els.saveState.textContent = 'saving...';
  try {
    const note = await invoke('update_note', { id, title, body });
    state.active = note;
    els.meta.textContent = (note.pinned ? 'Pinned · ' : '') + 'Updated ' + fmtDate(note.updated_at);
    els.saveState.textContent = 'saved';
    refreshStats();
    refreshOutline();
    if (state.preview) renderPreview();
    await loadNotes();
    maybeSnapshot();
    emitToPlugins('note:saved', cloneNote(note));
  } catch (e) { els.saveState.textContent = 'save failed'; setStatus('save failed: ' + e); }
}

function scheduleSave() {
  els.saveState.textContent = 'editing...';
  if (state.pendingTimer) clearTimeout(state.pendingTimer);
  state.pendingTimer = setTimeout(() => { state.pendingTimer = null; flushSave(); }, 500);
  if (state.preview) renderPreview();
  refreshStats();
}

async function deleteActive() {
  if (!state.activeId) return;
  if (!confirm('Move this note to trash?')) return;
  const id = state.activeId;
  if (state.pendingTimer) { clearTimeout(state.pendingTimer); state.pendingTimer = null; }
  try {
    await invoke('delete_note', { id });
    state.notes = state.notes.filter(n => n.id !== id);
    showEmpty();
    await loadNotes();
    emitToPlugins('note:deleted', { id });
  } catch (e) { setStatus('delete failed: ' + e); }
}

async function togglePin() {
  if (!state.activeId) return;
  const next = !state.active.pinned;
  try {
    const note = await invoke('set_pinned', { id: state.activeId, pinned: next });
    state.active = note;
    els.pinBtn.classList.toggle('on', note.pinned);
    els.pinBtn.title = note.pinned ? 'Unpin' : 'Pin to top';
    els.meta.textContent = (note.pinned ? 'Pinned · ' : '') + 'Updated ' + fmtDate(note.updated_at);
    await loadNotes();
  } catch (e) { setStatus('pin failed: ' + e); }
}

function updatePreviewUI() {
  els.preview.classList.toggle('hidden', !state.preview);
  els.body.classList.toggle('half', state.preview);
  els.previewBtn.classList.toggle('on', state.preview);
  if (state.preview) renderPreview();
}
function togglePreview() {
  if (!state.activeId) return;
  state.preview = !state.preview;
  updatePreviewUI();
}
function renderPreview() {
  if (!els.preview) return;
  const src = els.body.value || '';
  const { html } = window.Markdown.render(src);
  els.preview.innerHTML = html;
  els.preview.querySelectorAll('a.wiki-link').forEach(a => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      const title = a.dataset.wiki;
      const found = state.notes.find(n => (n.title || '').toLowerCase() === title.toLowerCase());
      if (found) openNote(found.id);
      else {
        if (confirm(`No note titled "${title}". Create one?`)) {
          const note = await invoke('create_note', { title, body: '' });
          await loadNotes(); openNote(note.id);
        }
      }
    });
  });
  els.preview.querySelectorAll('a.tag-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      state.activeTag = a.dataset.tag;
      state.query = ''; els.search.value = '';
      renderList(); renderTagBar();
    });
  });
  els.preview.querySelectorAll('.task-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const line = parseInt(cb.dataset.line, 10);
      if (!Number.isNaN(line)) toggleTaskAtLine(line);
    });
  });
}

async function refreshStats() {
  if (!state.activeId) return;
  try {
    const s = await invoke('note_stats', { id: state.activeId });
    els.statWords.textContent = s.words + (s.words === 1 ? ' word' : ' words');
    els.statChars.textContent = s.chars + ' chars';
    els.statRead.textContent = '~' + s.read_minutes + ' min read';
  } catch (e) { /* silent */ }
}

async function refreshBacklinks() {
  if (!state.settings.show_backlinks) { els.backlinksPanel.classList.add('hidden'); return; }
  if (!state.active || !state.active.title) { els.backlinksPanel.classList.add('hidden'); return; }
  try {
    const links = await invoke('backlinks', { title: state.active.title });
    if (!links.length) { els.backlinksPanel.classList.add('hidden'); return; }
    els.backlinksPanel.classList.remove('hidden');
    els.backlinksList.innerHTML = '';
    for (const b of links) {
      const li = document.createElement('li');
      const a = document.createElement('a'); a.href = '#';
      a.textContent = b.title || 'Untitled';
      a.addEventListener('click', (e) => { e.preventDefault(); openNote(b.id); });
      li.appendChild(a);
      const t = document.createElement('span'); t.className = 'bl-time'; t.textContent = fmtDate(b.updated_at);
      li.appendChild(t);
      els.backlinksList.appendChild(li);
    }
  } catch (e) { console.error(e); }
}

async function exportActiveMd() {
  if (!state.activeId) return;
  try {
    const md = await invoke('export_note_md', { id: state.activeId });
    const title = (state.active.title || 'Untitled').replace(/[^a-zA-Z0-9_\- ]/g, '_').trim();
    downloadText(`${title || 'Untitled'}.md`, md, 'text/markdown');
  } catch (e) { alert('Export failed: ' + e); }
}

async function exportAllMd() {
  try {
    const bundle = await invoke('export_all_md');
    downloadJson('mycelium-export.json', { format: 'mycelium-export-v1', exported_at: new Date().toISOString(), notes: bundle.map(([f, c]) => ({ filename: f, content: c })) });
  } catch (e) { alert('Export failed: ' + e); }
}

async function importMdFile() {
  const f = await pickFile('.md,.markdown,.txt');
  if (!f) return;
  try {
    const note = await invoke('import_md', { content: f.text, suggestedTitle: f.name.replace(/\.[^.]+$/, '') });
    await loadNotes(); openNote(note.id);
  } catch (e) { alert('Import failed: ' + e); }
}

function downloadText(name, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function downloadJson(name, obj) { downloadText(name, JSON.stringify(obj, null, 2), 'application/json'); }

function pickFile(accept) {
  return new Promise((resolve) => {
    els.fileInput.value = '';
    els.fileInput.accept = accept || '.json';
    els.fileInput.onchange = async () => {
      const f = els.fileInput.files && els.fileInput.files[0];
      if (!f) return resolve(null);
      const text = await f.text();
      try {
        const json = JSON.parse(text);
        resolve({ name: f.name, json, text });
      } catch (_) {
        resolve({ name: f.name, json: null, text });
      }
    };
    els.fileInput.click();
  });
}

async function openTrash() {
  state.view = 'trash';
  document.querySelectorAll('.side-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'trash'));
  showView('trash');
  try {
    const trash = await invoke('list_trash');
    renderTrashList(trash);
  } catch (e) { setStatus('trash load failed: ' + e); }
}

async function openAllNotes() {
  state.view = 'all';
  document.querySelectorAll('.side-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'all'));
  if (state.activeId) showView('editor'); else showView('empty');
  await loadNotes();
}

function renderTrashList(items) {
  els.trashList.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'empty-row';
    li.textContent = 'Trash is empty.';
    els.trashList.appendChild(li);
    return;
  }
  for (const n of items) {
    const li = document.createElement('li');
    const main = document.createElement('div');
    main.className = 'tr-main';
    const t = document.createElement('div'); t.className = 'tr-title';
    t.textContent = n.title && n.title.trim() ? n.title : 'Untitled';
    const sub = document.createElement('div'); sub.className = 'tr-sub';
    sub.textContent = 'Trashed ' + fmtDate(n.trashed_at);
    main.appendChild(t); main.appendChild(sub);
    const actions = document.createElement('div'); actions.className = 'tr-actions';
    const restoreBtn = document.createElement('button'); restoreBtn.className = 'ghost-btn'; restoreBtn.textContent = 'Restore';
    restoreBtn.addEventListener('click', async () => {
      await invoke('restore_note', { id: n.id }); await loadNotes(); openTrash();
    });
    const purgeBtn = document.createElement('button'); purgeBtn.className = 'danger-btn'; purgeBtn.textContent = 'Delete forever';
    purgeBtn.addEventListener('click', async () => {
      if (!confirm('Permanently delete "' + (n.title || 'Untitled') + '"? This cannot be undone.')) return;
      await invoke('purge_note', { id: n.id }); openTrash();
    });
    actions.appendChild(restoreBtn); actions.appendChild(purgeBtn);
    li.appendChild(main); li.appendChild(actions);
    els.trashList.appendChild(li);
  }
}

async function emptyTrash() {
  if (!confirm('Permanently delete every note in the trash? This cannot be undone.')) return;
  try { const n = await invoke('empty_trash'); setStatus('Purged ' + n + ' note(s).'); openTrash(); }
  catch (e) { alert('Empty trash failed: ' + e); }
}

function cycleTheme() {
  const all = [...BUILTIN_THEMES, ...state.themes];
  const i = all.findIndex(t => t.id === state.activeThemeId);
  const next = all[(i + 1) % all.length];
  applyTheme(next.id); state.settings.theme = next.id;
  invoke('set_settings', { settings: state.settings }).catch(()=>{});
  renderActiveThemeSelect();
}

function openSettings(tab) { els.modalBackdrop.classList.remove('hidden'); if (tab) switchTab(tab); refreshLockUi(); }
function closeSettings() { els.modalBackdrop.classList.add('hidden'); }
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
}

async function loadSettings() {
  try {
    state.settings = await invoke('get_settings');
    if (!state.settings.enabled_plugins) state.settings.enabled_plugins = [];
    if (state.settings.default_preview === undefined) state.settings.default_preview = false;
    if (state.settings.show_backlinks === undefined) state.settings.show_backlinks = true;
    if (!state.settings.saved_searches) state.settings.saved_searches = [];
    if (state.settings.spell_check === undefined) state.settings.spell_check = false;
    if (!state.settings.sort_by) state.settings.sort_by = 'updated';
    els.optAutoUpdate.checked = !!state.settings.auto_check_updates;
    els.optDefaultPreview.checked = !!state.settings.default_preview;
    els.optShowBacklinks.checked = !!state.settings.show_backlinks;
    els.optSpellCheck.checked = !!state.settings.spell_check;
    els.optSort.value = state.settings.sort_by;
    applySpellCheck();
    renderSavedSearches();
  } catch (e) { console.error(e); }
}

function applySpellCheck() {
  const on = !!state.settings.spell_check;
  els.title.spellcheck = on;
  els.body.spellcheck = on;
}

function sortNotes(notes) {
  const by = state.settings.sort_by || 'updated';
  const arr = notes.slice();
  arr.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
    if (by === 'title') return (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase());
    if (by === 'created') return (b.created_at || b.updated_at || '').localeCompare(a.created_at || a.updated_at || '');
    return (b.updated_at || '').localeCompare(a.updated_at || '');
  });
  return arr;
}

function renderSavedSearches() {
  const list = state.settings.saved_searches || [];
  if (!list.length) { els.savedSearches.classList.add('hidden'); els.savedSearches.innerHTML = ''; return; }
  els.savedSearches.classList.remove('hidden');
  els.savedSearches.innerHTML = '';
  const lab = document.createElement('div'); lab.className = 'ss-label'; lab.textContent = 'Saved searches';
  els.savedSearches.appendChild(lab);
  for (const s of list) {
    const row = document.createElement('div'); row.className = 'ss-row';
    const btnUse = document.createElement('button'); btnUse.className = 'ss-use'; btnUse.textContent = s.name;
    btnUse.title = s.query;
    btnUse.addEventListener('click', () => { els.search.value = s.query; state.query = s.query; loadNotes(); });
    const btnDel = document.createElement('button'); btnDel.className = 'ss-del'; btnDel.textContent = '×'; btnDel.title = 'Delete';
    btnDel.addEventListener('click', async () => {
      state.settings.saved_searches = state.settings.saved_searches.filter(x => x.name !== s.name);
      await saveSettings(); renderSavedSearches();
    });
    row.appendChild(btnUse); row.appendChild(btnDel);
    els.savedSearches.appendChild(row);
  }
}

async function saveCurrentSearch() {
  const q = state.query.trim();
  if (!q) { alert('Type something in the search box first.'); return; }
  const name = prompt('Name for this saved search:', q);
  if (!name) return;
  state.settings.saved_searches = (state.settings.saved_searches || []).filter(s => s.name !== name);
  state.settings.saved_searches.push({ name, query: q });
  await saveSettings(); renderSavedSearches();
}

async function openHistory() {
  if (!state.activeId) { alert('Open a note first.'); return; }
  els.historyModal.classList.remove('hidden');
  await refreshHistoryList();
}
function closeHistory() { els.historyModal.classList.add('hidden'); }

async function refreshHistoryList() {
  els.historyList.innerHTML = '';
  try {
    const items = await invoke('list_history', { id: state.activeId });
    if (!items.length) {
      const li = document.createElement('li');
      li.style.color = 'var(--text-3)'; li.style.fontSize = '12.5px'; li.style.padding = '8px 0';
      li.textContent = 'No history yet. Snapshots are written on every save (with a 10-second cooldown).';
      els.historyList.appendChild(li);
      return;
    }
    for (const it of items) {
      const li = document.createElement('li');
      const main = document.createElement('div'); main.className = 'row-main';
      const name = document.createElement('div'); name.className = 'row-name';
      name.textContent = it.title || 'Untitled';
      const sub = document.createElement('div'); sub.className = 'row-sub';
      const d = new Date(it.timestamp);
      sub.textContent = `${d.toLocaleString()} · ${it.chars} chars · ${(it.body_preview || '').replace(/\n/g, ' ')}`;
      main.appendChild(name); main.appendChild(sub);
      const actions = document.createElement('div'); actions.className = 'row-actions';
      actions.appendChild(btn('ghost-btn', 'Preview', () => { alert((it.body_preview || '').slice(0, 400) + (it.body_preview && it.body_preview.length > 400 ? '…' : '')); }));
      actions.appendChild(btn('primary-btn small', 'Restore', async () => {
        if (!confirm('Restore this snapshot? The current note state is automatically saved as a snapshot first.')) return;
        await invoke('snapshot_note', { id: state.activeId });
        const stamp = formatHistoryStamp(it.timestamp);
        await invoke('restore_history', { id: state.activeId, timestamp: stamp });
        closeHistory();
        await loadNotes(); openNote(state.activeId);
      }));
      li.appendChild(main); li.appendChild(actions);
      els.historyList.appendChild(li);
    }
  } catch (e) { console.error(e); }
}

function formatHistoryStamp(iso) {
  const d = new Date(iso);
  const pad = (n, w) => String(n).padStart(w || 2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}${pad(d.getUTCMilliseconds(), 3)}`;
}

async function purgeHistoryActive() {
  if (!state.activeId) return;
  if (!confirm('Permanently delete all history for this note?')) return;
  try { const n = await invoke('purge_history', { id: state.activeId }); alert(`Purged ${n} snapshot(s).`); refreshHistoryList(); }
  catch (e) { alert('Purge failed: ' + e); }
}

let _lastSnapshot = 0;
async function maybeSnapshot() {
  if (!state.activeId) return;
  const now = Date.now();
  if (now - _lastSnapshot < 10000) return;
  _lastSnapshot = now;
  try { await invoke('snapshot_note', { id: state.activeId }); } catch (e) { /* silent */ }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || '';
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function attachFile(file) {
  if (!state.activeId) { alert('Open a note first.'); return; }
  if (file.size > 5 * 1024 * 1024) { alert('Attachments are limited to 5 MB in beta.4. (Larger attachments need a separate-file storage scheme — coming in beta.5.)'); return; }
  const mime = file.type || 'application/octet-stream';
  const isImage = mime.startsWith('image/');
  try {
    const base64 = await readFileAsBase64(file);
    const url = await invoke('attachment_data_url', { content: base64, mime });
    const name = file.name || 'attachment';
    const md = isImage ? `\n\n![${name}](${url})\n\n` : `\n\n[${name}](${url})\n\n`;
    insertAtCursor(els.body, md);
    scheduleSave();
  } catch (e) { alert('Attach failed: ' + e); }
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = before + text + after;
  const pos = start + text.length;
  textarea.selectionStart = textarea.selectionEnd = pos;
  textarea.focus();
}

async function pickAttachment() {
  els.attachInput.value = '';
  els.attachInput.accept = '*/*';
  els.attachInput.onchange = async () => {
    const f = els.attachInput.files && els.attachInput.files[0];
    if (f) await attachFile(f);
  };
  els.attachInput.click();
}

async function exportWorkspace() {
  try {
    const bundle = await invoke('export_workspace');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadJson(`mycelium-workspace-${stamp}.json`, bundle);
    alert('Workspace exported. Keep this file safe.');
  } catch (e) { alert('Export failed: ' + e); }
}

async function importWorkspace() {
  const r = await pickFile('.json'); if (!r || !r.json) return;
  if (r.json.format !== 'mycelium-workspace-v1') { alert('Not a Mycelium workspace bundle.'); return; }
  const overwrite = confirm('Overwrite notes that already exist with the same ID?\n\nOK = overwrite, Cancel = keep existing copies.');
  try {
    const summary = await invoke('import_workspace', { bundle: r.json, overwrite });
    alert(`Restored. Notes: ${summary.notes_imported} imported, ${summary.notes_skipped} skipped. Themes: ${summary.themes_imported}. Templates: ${summary.templates_imported}.`);
    await loadThemes(); await loadTemplates(); await loadNotes(); await loadSettings();
  } catch (e) { alert('Restore failed: ' + e); }
}

async function saveSettings() {
  state.settings.auto_check_updates = !!els.optAutoUpdate.checked;
  state.settings.default_preview = !!els.optDefaultPreview.checked;
  state.settings.show_backlinks = !!els.optShowBacklinks.checked;
  state.settings.spell_check = !!els.optSpellCheck.checked;
  state.settings.sort_by = els.optSort.value || 'updated';
  try { await invoke('set_settings', { settings: state.settings }); } catch (e) { console.error(e); }
  refreshBacklinks();
  applySpellCheck();
}

async function loadThemes() {
  try { state.themes = await invoke('list_themes'); } catch (e) { state.themes = []; }
  renderThemeList(); renderActiveThemeSelect();
}
function renderActiveThemeSelect() {
  const sel = els.activeThemeSelect; sel.innerHTML = '';
  for (const t of [...BUILTIN_THEMES, ...state.themes]) {
    const o = document.createElement('option');
    o.value = t.id; o.textContent = t.name + (t.builtin ? '' : ' (custom)');
    if (t.id === state.activeThemeId) o.selected = true;
    sel.appendChild(o);
  }
}
function renderThemeList() {
  const ul = els.themeList; ul.innerHTML = '';
  for (const t of [...BUILTIN_THEMES, ...state.themes]) {
    const li = document.createElement('li');
    const main = document.createElement('div'); main.className = 'row-main';
    const name = document.createElement('div'); name.className = 'row-name';
    name.textContent = t.name;
    if (t.id === state.activeThemeId) { const b = document.createElement('span'); b.className = 'badge on'; b.textContent = 'active'; name.appendChild(b); }
    if (t.builtin) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = 'built-in'; name.appendChild(b); }
    const sub = document.createElement('div'); sub.className = 'row-sub'; sub.textContent = t.id;
    main.appendChild(name); main.appendChild(sub);
    const actions = document.createElement('div'); actions.className = 'row-actions';
    actions.appendChild(btn('ghost-btn', 'Use', () => { applyTheme(t.id); state.settings.theme = t.id; saveSettings(); renderThemeList(); renderActiveThemeSelect(); }));
    if (!t.builtin) actions.appendChild(btn('ghost-btn', 'Edit', () => openThemeEditor(t)));
    else actions.appendChild(btn('ghost-btn', 'Duplicate', () => openThemeEditor(forkTheme(t))));
    li.appendChild(main); li.appendChild(actions);
    ul.appendChild(li);
  }
}
function btn(cls, text, onClick) { const b = document.createElement('button'); b.className = cls; b.textContent = text; b.addEventListener('click', onClick); return b; }
function forkTheme(s) { return { id: (s.id + '-copy').replace(/[^a-z0-9_-]/gi, ''), name: s.name + ' (copy)', author: '', builtin: false, colors: {...s.colors}, radii: {...(s.radii||{})}, typography: {...(s.typography||{})} }; }
function blankTheme() { const base = BUILTIN_THEMES[0]; return { id: '', name: 'New theme', author: '', builtin: false, colors: {...base.colors}, radii: {...base.radii}, typography: {...base.typography} }; }

function openThemeEditor(theme) {
  state.editingTheme = theme;
  els.themeEditor.classList.remove('hidden');
  els.teName.value = theme.name || ''; els.teId.value = theme.id || '';
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
    color.addEventListener('input', () => { text.value = color.value; document.body.style.setProperty(key, color.value); });
    text.addEventListener('input', () => { const nv = text.value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(nv)) { color.value = nv; document.body.style.setProperty(key, nv); } });
    row.appendChild(lab); row.appendChild(color); row.appendChild(text);
    cdiv.appendChild(row);
  }
  els.teDeleteBtn.classList.toggle('hidden', !theme.id || theme.builtin);
  els.themeEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function normalizeHex(v) { if (!v) return '#000000'; if (v.length === 4 && v[0] === '#') return '#' + v[1]+v[1]+v[2]+v[2]+v[3]+v[3]; return v; }
function readThemeFromEditor() {
  const colors = {};
  for (const [k] of COLOR_KEYS) { const t = document.querySelector('#col-' + k.slice(2)).nextElementSibling; colors[k] = t.value; }
  return { id: els.teId.value.trim(), name: els.teName.value.trim() || 'Untitled theme', author: '', builtin: false, colors,
    radii: { '--radius': els.teRadius.value || '10px', '--radius-sm': els.teRadiusSm.value || '6px' },
    typography: { '--font-family': els.teFont.value || '-apple-system, sans-serif', '--font-size': els.teFontSize.value || '14px' }};
}
async function saveThemeFromEditor() {
  const t = readThemeFromEditor();
  if (!t.id) { alert('Theme ID is required'); return; }
  if (!/^[a-z0-9_-]+$/i.test(t.id)) { alert('Theme ID must be alphanumeric / - / _'); return; }
  try { await invoke('save_theme', { theme: t }); state.editingTheme = null; els.themeEditor.classList.add('hidden'); await loadThemes(); applyTheme(t.id); state.settings.theme = t.id; saveSettings(); }
  catch (e) { alert('Save failed: ' + e); }
}
function exportThemeFromEditor() { downloadJson('mycelium-theme-' + (els.teId.value || 'untitled') + '.json', readThemeFromEditor()); }
async function deleteEditingTheme() {
  if (!state.editingTheme || !state.editingTheme.id || state.editingTheme.builtin) return;
  if (!confirm('Delete theme "' + state.editingTheme.name + '"?')) return;
  try { await invoke('delete_theme', { id: state.editingTheme.id }); state.editingTheme = null; els.themeEditor.classList.add('hidden'); await loadThemes(); renderThemeList(); renderActiveThemeSelect(); }
  catch (e) { alert('Delete failed: ' + e); }
}
async function importTheme() {
  const r = await pickFile('.json'); if (!r || !r.json) return;
  const t = r.json; if (!t.id || !t.colors) { alert('Not a valid theme JSON'); return; }
  t.builtin = false;
  try { await invoke('save_theme', { theme: t }); await loadThemes(); alert('Theme imported.'); }
  catch (e) { alert('Import failed: ' + e); }
}

async function loadPlugins() {
  try { state.plugins = await invoke('list_plugins'); } catch (e) { state.plugins = []; }
  renderPluginList(); startEnabledPlugins();
}
function renderPluginList() {
  const ul = els.pluginList; ul.innerHTML = '';
  if (!state.plugins.length) {
    const li = document.createElement('li'); li.style.background = 'transparent'; li.style.color = 'var(--text-3)'; li.style.fontSize = '12.5px'; li.style.padding = '8px 0';
    li.textContent = 'No plugins installed yet.'; ul.appendChild(li); return;
  }
  for (const p of state.plugins) {
    const li = document.createElement('li');
    const main = document.createElement('div'); main.className = 'row-main';
    const name = document.createElement('div'); name.className = 'row-name'; name.textContent = p.manifest.name + ' ';
    const ver = document.createElement('span'); ver.className = 'badge'; ver.textContent = 'v' + p.manifest.version; name.appendChild(ver);
    if (state.settings.enabled_plugins.includes(p.manifest.id)) { const e = document.createElement('span'); e.className = 'badge on'; e.textContent = 'on'; name.appendChild(e); }
    const sub = document.createElement('div'); sub.className = 'row-sub'; sub.textContent = p.manifest.description || p.manifest.id;
    main.appendChild(name); main.appendChild(sub);
    const actions = document.createElement('div'); actions.className = 'row-actions';
    const enabled = state.settings.enabled_plugins.includes(p.manifest.id);
    actions.appendChild(btn('ghost-btn', enabled ? 'Disable' : 'Enable', () => togglePlugin(p, !enabled)));
    actions.appendChild(btn('danger-btn', 'Uninstall', () => uninstallPlugin(p)));
    li.appendChild(main); li.appendChild(actions); ul.appendChild(li);
  }
}
async function togglePlugin(p, enable) {
  const s = new Set(state.settings.enabled_plugins);
  if (enable) s.add(p.manifest.id); else s.delete(p.manifest.id);
  state.settings.enabled_plugins = Array.from(s); await saveSettings();
  if (enable) startPlugin(p); else stopPlugin(p.manifest.id);
  renderPluginList();
}
async function uninstallPlugin(p) {
  if (!confirm('Uninstall plugin "' + p.manifest.name + '"?')) return;
  stopPlugin(p.manifest.id);
  try { await invoke('uninstall_plugin', { id: p.manifest.id }); state.settings.enabled_plugins = state.settings.enabled_plugins.filter(id => id !== p.manifest.id); await saveSettings(); await loadPlugins(); }
  catch (e) { alert('Uninstall failed: ' + e); }
}
async function installPluginFromFile() {
  const r = await pickFile('.json'); if (!r || !r.json) return;
  const j = r.json;
  if (!j.manifest || !j.code) { alert('Not a valid plugin bundle'); return; }
  try { await invoke('install_plugin', { manifest: j.manifest, code: j.code }); await loadPlugins(); alert('Plugin "' + j.manifest.name + '" installed.'); }
  catch (e) { alert('Install failed: ' + e); }
}

const PLUGIN_BOOTSTRAP = `
let _h = {}, _c = {};
self.mycelium = {
  on(e, fn) { (_h[e] = _h[e] || []).push(fn); },
  command(n, fn) { _c[n] = fn; postMessage({ type: 'command:registered', name: n }); },
  log(...a) { postMessage({ type: 'log', args: a.map(x => typeof x === 'string' ? x : JSON.stringify(x)) }); },
};
self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'event') (_h[m.event] || []).forEach(fn => { try { fn(m.payload); } catch (err) { postMessage({ type: 'error', message: String(err) }); } });
};
`;
function startEnabledPlugins() { for (const p of state.plugins) if (state.settings.enabled_plugins.includes(p.manifest.id)) startPlugin(p); }
function startPlugin(p) {
  if (state.pluginWorkers.has(p.manifest.id)) return;
  try {
    const blob = new Blob([PLUGIN_BOOTSTRAP + '\n;(function(){\n' + p.code + '\n})();'], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob); const worker = new Worker(url);
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'log') console.log('[plugin ' + p.manifest.id + ']', ...m.args);
      else if (m.type === 'error') console.error('[plugin ' + p.manifest.id + ']', m.message);
    };
    state.pluginWorkers.set(p.manifest.id, worker);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) { console.error('plugin start failed', e); }
}
function stopPlugin(id) { const w = state.pluginWorkers.get(id); if (w) { try { w.terminate(); } catch (e) {} state.pluginWorkers.delete(id); } }
function emitToPlugins(event, payload) { for (const w of state.pluginWorkers.values()) { try { w.postMessage({ type: 'event', event, payload }); } catch (e) {} } }

async function refreshOutline() {
  if (!state.activeId) { els.outlinePanel.classList.add('hidden'); return; }
  if (!state.outlineOpen) { els.outlinePanel.classList.add('hidden'); return; }
  try {
    const items = await invoke('outline', { id: state.activeId });
    if (!items.length) { els.outlinePanel.classList.add('hidden'); els.outlineList.innerHTML = ''; return; }
    els.outlinePanel.classList.remove('hidden');
    els.outlineList.innerHTML = '';
    for (const it of items) {
      const li = document.createElement('li');
      li.className = 'ol-l' + Math.min(it.level, 4);
      li.textContent = it.title;
      li.addEventListener('click', () => jumpToLine(it.line));
      els.outlineList.appendChild(li);
    }
  } catch (e) { console.error(e); }
}
function jumpToLine(lineNo) {
  const lines = els.body.value.split('\n');
  let pos = 0;
  for (let i = 0; i < Math.min(lineNo - 1, lines.length); i++) pos += lines[i].length + 1;
  els.body.focus();
  els.body.setSelectionRange(pos, pos);
  const lineHeight = 24;
  els.body.scrollTop = (lineNo - 1) * lineHeight;
  if (state.preview) {
    const headings = els.preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const idx = Math.min(lineNo, headings.length) - 1;
    if (headings[idx]) headings[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
function toggleOutline() {
  state.outlineOpen = !state.outlineOpen;
  els.outlineBtn.classList.toggle('on', state.outlineOpen);
  refreshOutline();
}

async function toggleTaskAtLine(lineNo) {
  if (!state.activeId) return;
  const lines = els.body.value.split('\n');
  if (lineNo < 0 || lineNo >= lines.length) return;
  const line = lines[lineNo];
  const m = line.match(/^(\s*[-*+]\s+\[)([ xX])(\]\s.*)$/);
  if (!m) return;
  const next = (m[2] === ' ') ? 'x' : ' ';
  lines[lineNo] = m[1] + next + m[3];
  els.body.value = lines.join('\n');
  scheduleSave();
  if (state.preview) renderPreview();
}

async function newDailyNote() {
  try {
    if (state.pendingTimer) { clearTimeout(state.pendingTimer); await flushSave(); }
    const note = await invoke('daily_note');
    await loadNotes(); openNote(note.id); els.body.focus();
  } catch (e) { setStatus('daily failed: ' + e); }
}

async function loadTemplates() {
  try { state.templates = await invoke('list_templates'); }
  catch (e) { state.templates = []; }
  renderTemplateList();
}
function renderTemplateList() {
  const ul = els.templateList; if (!ul) return;
  ul.innerHTML = '';
  if (!state.templates.length) {
    const li = document.createElement('li');
    li.style.background = 'transparent'; li.style.color = 'var(--text-3)'; li.style.fontSize = '12.5px'; li.style.padding = '8px 0';
    li.textContent = 'No templates yet. Open a note, then click "Save current note as template" below.';
    ul.appendChild(li); return;
  }
  for (const t of state.templates) {
    const li = document.createElement('li');
    const main = document.createElement('div'); main.className = 'row-main';
    const name = document.createElement('div'); name.className = 'row-name'; name.textContent = t.name;
    const sub = document.createElement('div'); sub.className = 'row-sub';
    sub.textContent = (t.body.length > 80 ? t.body.slice(0, 80) + '…' : t.body).replace(/\n/g, ' ');
    main.appendChild(name); main.appendChild(sub);
    const actions = document.createElement('div'); actions.className = 'row-actions';
    actions.appendChild(btn('ghost-btn', 'Use', async () => {
      const title = prompt('New note title:', t.name);
      if (title === null) return;
      const note = await invoke('note_from_template', { templateId: t.id, title });
      closeSettings(); await loadNotes(); openNote(note.id);
    }));
    actions.appendChild(btn('danger-btn', 'Delete', async () => {
      if (!confirm('Delete template "' + t.name + '"?')) return;
      await invoke('delete_template', { id: t.id }); await loadTemplates();
    }));
    li.appendChild(main); li.appendChild(actions);
    ul.appendChild(li);
  }
}
async function saveActiveAsTemplate() {
  if (!state.activeId) { alert('Open a note first, then save it as a template.'); return; }
  const name = prompt('Template name:', state.active.title || 'New template');
  if (!name) return;
  try { await invoke('save_template', { name, body: els.body.value }); await loadTemplates(); }
  catch (e) { alert('Save failed: ' + e); }
}

async function openTemplateMenu(anchor) {
  await loadTemplates();
  const menu = els.templateMenu; menu.innerHTML = '';
  if (!state.templates.length) {
    const li = document.createElement('li');
    li.className = 'ctx-empty';
    li.textContent = 'No templates yet. Open Settings → Data to create one.';
    menu.appendChild(li);
  } else {
    for (const t of state.templates) {
      const li = document.createElement('li');
      li.textContent = t.name;
      li.addEventListener('click', async () => {
        hideMenus();
        const note = await invoke('note_from_template', { templateId: t.id, title: t.name });
        await loadNotes(); openNote(note.id);
      });
      menu.appendChild(li);
    }
  }
  const r = anchor.getBoundingClientRect();
  menu.style.left = r.left + 'px';
  menu.style.top = (r.bottom + 4) + 'px';
  menu.classList.remove('hidden');
}

function showContextMenu(x, y, note) {
  const menu = els.ctxMenu; menu.innerHTML = '';
  const items = [
    { label: note.pinned ? 'Unpin' : 'Pin to top', run: async () => { await invoke('set_pinned', { id: note.id, pinned: !note.pinned }); await loadNotes(); if (state.activeId === note.id) await openNote(note.id); } },
    { label: 'Duplicate', run: async () => { const dup = await invoke('duplicate_note', { id: note.id }); await loadNotes(); openNote(dup.id); } },
    { label: 'Export as Markdown', run: async () => {
      try { const md = await invoke('export_note_md', { id: note.id }); const safe = (note.title || 'Untitled').replace(/[^a-zA-Z0-9_\- ]/g, '_').trim(); downloadText((safe || 'Untitled') + '.md', md, 'text/markdown'); }
      catch (e) { alert('Export failed: ' + e); }
    } },
    { sep: true },
    { label: 'Move to trash', danger: true, run: async () => {
      if (!confirm('Move this note to trash?')) return;
      await invoke('delete_note', { id: note.id });
      if (state.activeId === note.id) showEmpty();
      await loadNotes();
    } },
  ];
  for (const it of items) {
    const li = document.createElement('li');
    if (it.sep) { li.className = 'ctx-sep'; }
    else {
      li.textContent = it.label;
      if (it.danger) li.classList.add('danger');
      li.addEventListener('click', () => { hideMenus(); it.run(); });
    }
    menu.appendChild(li);
  }
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.classList.remove('hidden');
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 6) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
}
function hideMenus() {
  els.ctxMenu.classList.add('hidden');
  els.templateMenu.classList.add('hidden');
}

function wrapSelection(textarea, before, after, placeholder) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const sel = value.slice(start, end);
  const inner = sel || (placeholder || '');
  const prefix = value.slice(0, start);
  const suffix = value.slice(end);
  const updated = prefix + before + inner + after + suffix;
  textarea.value = updated;
  if (sel) {
    textarea.selectionStart = start + before.length;
    textarea.selectionEnd = start + before.length + inner.length;
  } else {
    textarea.selectionStart = textarea.selectionEnd = start + before.length;
  }
  textarea.focus();
  scheduleSave();
}

function applyFormat(fmt) {
  if (!state.activeId) return;
  const ta = els.body;
  switch (fmt) {
    case 'bold':   wrapSelection(ta, '**', '**', 'bold text'); break;
    case 'italic': wrapSelection(ta, '*', '*', 'italic text'); break;
    case 'code':   wrapSelection(ta, '`', '`', 'code'); break;
    case 'strike': wrapSelection(ta, '~~', '~~', 'struck text'); break;
    case 'link': {
      const url = prompt('URL:', 'https://');
      if (!url) return;
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      wrapSelection(ta, '[', `](${url})`, sel || 'link text');
      break;
    }
    case 'h1':    wrapLineStart(ta, '# '); break;
    case 'h2':    wrapLineStart(ta, '## '); break;
    case 'quote': wrapLineStart(ta, '> '); break;
  }
}

function wrapLineStart(textarea, prefix) {
  const start = textarea.selectionStart;
  const value = textarea.value;
  let lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const before = value.slice(0, lineStart);
  const after = value.slice(lineStart);
  textarea.value = before + prefix + after;
  textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
  textarea.focus();
  scheduleSave();
}

function showSelToolbar() {
  if (!state.activeId || state.preview) { hideSelToolbar(); return; }
  const ta = els.body;
  if (ta.selectionStart === ta.selectionEnd) { hideSelToolbar(); return; }
  const taRect = ta.getBoundingClientRect();
  const tb = els.selToolbar;
  tb.classList.remove('hidden');
  const tbRect = tb.getBoundingClientRect();
  const left = Math.min(taRect.left + 30, window.innerWidth - tbRect.width - 12);
  const top = Math.max(taRect.top - tbRect.height - 6, 6);
  tb.style.left = left + 'px';
  tb.style.top = top + 'px';
}
function hideSelToolbar() { els.selToolbar.classList.add('hidden'); }

function openCheatsheet() { els.cheatsheetModal.classList.remove('hidden'); }
function closeCheatsheet() { els.cheatsheetModal.classList.add('hidden'); }

async function refreshLockUi() {
  try {
    const s = await invoke('lock_status');
    state.lockEnabled = !!s.enabled;
    state.locked = !!s.locked;
    if (state.locked) showLockScreen(); else hideLockScreen();
    if (els.lockStateText && els.lockControls) {
      els.lockStateText.textContent = s.enabled
        ? 'Workspace lock is enabled. The app starts on a passphrase prompt; you can lock now any time.'
        : 'Workspace lock is disabled. Anyone with access to this machine can read your notes.';
      els.lockControls.innerHTML = '';
      if (!s.enabled) {
        els.lockControls.appendChild(btn('primary-btn small', 'Enable workspace lock', enableLockFlow));
      } else {
        els.lockControls.appendChild(btn('primary-btn small', 'Lock now', lockNowFlow));
        els.lockControls.appendChild(btn('ghost-btn', 'Change passphrase', changePassphraseFlow));
        els.lockControls.appendChild(btn('danger-btn', 'Disable lock', disableLockFlow));
      }
    }
  } catch (e) { console.error('lock status error', e); }
}

function showLockScreen() {
  els.lockScreen.classList.remove('hidden');
  els.lockPass.value = '';
  els.lockError.textContent = '';
  setTimeout(() => els.lockPass.focus(), 50);
}
function hideLockScreen() { els.lockScreen.classList.add('hidden'); }

async function attemptUnlock() {
  const p = els.lockPass.value;
  if (!p) return;
  try {
    const ok = await invoke('lock_unlock', { passphrase: p });
    if (ok) {
      state.locked = false;
      hideLockScreen();
      els.lockPass.value = '';
      await loadNotes();
      await loadTemplates();
    } else {
      els.lockError.textContent = 'Incorrect passphrase.';
      els.lockPass.select();
    }
  } catch (e) {
    els.lockError.textContent = 'Unlock error: ' + e;
  }
}

async function enableLockFlow() {
  const p = prompt('New passphrase (at least 6 characters):');
  if (!p) return;
  if (p.length < 6) { alert('Passphrase must be at least 6 characters.'); return; }
  const confirm2 = prompt('Confirm passphrase:');
  if (p !== confirm2) { alert('Passphrases do not match.'); return; }
  try {
    await invoke('lock_set', { oldPassphrase: null, newPassphrase: p });
    alert('Workspace lock enabled. You will be prompted on next launch.');
    refreshLockUi();
  } catch (e) { alert('Failed to enable: ' + e); }
}

async function changePassphraseFlow() {
  const oldP = prompt('Current passphrase:');
  if (!oldP) return;
  const newP = prompt('New passphrase (at least 6 characters):');
  if (!newP) return;
  if (newP.length < 6) { alert('Passphrase must be at least 6 characters.'); return; }
  const confirm2 = prompt('Confirm new passphrase:');
  if (newP !== confirm2) { alert('Passphrases do not match.'); return; }
  try {
    await invoke('lock_set', { oldPassphrase: oldP, newPassphrase: newP });
    alert('Passphrase changed.');
  } catch (e) { alert('Failed: ' + e); }
}

async function disableLockFlow() {
  const p = prompt('Current passphrase to disable lock:');
  if (!p) return;
  try {
    await invoke('lock_disable', { passphrase: p });
    alert('Workspace lock disabled.');
    refreshLockUi();
  } catch (e) { alert('Failed: ' + e); }
}

async function lockNowFlow() {
  try { await invoke('lock_now'); state.locked = true; closeSettings(); showLockScreen(); }
  catch (e) { alert('Lock failed: ' + e); }
}

const PALETTE_COMMANDS = [
  { name: 'New note', shortcut: 'Ctrl+N', run: newNote },
  { name: 'New daily note', shortcut: 'Ctrl+D', run: newDailyNote },
  { name: 'New from template...', shortcut: '', run: () => openTemplateMenu(els.newFromTemplate || els.newNote) },
  { name: 'Toggle preview', shortcut: 'Ctrl+M', run: togglePreview },
  { name: 'Toggle outline', shortcut: '', run: toggleOutline },
  { name: 'Focus search', shortcut: '/', run: () => els.search.focus() },
  { name: 'Cycle theme', shortcut: 'Ctrl+,', run: cycleTheme },
  { name: 'Open settings', shortcut: '', run: () => openSettings('general') },
  { name: 'Open trash', shortcut: '', run: openTrash },
  { name: 'All notes', shortcut: '', run: openAllNotes },
  { name: 'Export current note', shortcut: '', run: exportActiveMd },
  { name: 'Export all notes', shortcut: '', run: exportAllMd },
  { name: 'Import Markdown', shortcut: '', run: importMdFile },
  { name: 'Save current as template', shortcut: '', run: saveActiveAsTemplate },
  { name: 'Duplicate current note', shortcut: '', run: async () => { if (state.activeId) { const dup = await invoke('duplicate_note', { id: state.activeId }); await loadNotes(); openNote(dup.id); } } },
  { name: 'Pin / unpin current', shortcut: '', run: togglePin },
  { name: 'Show keyboard cheatsheet', shortcut: 'Ctrl+/', run: openCheatsheet },
  { name: 'Lock workspace now', shortcut: '', run: lockNowFlow },
  { name: 'Bold selection', shortcut: 'Ctrl+B', run: () => applyFormat('bold') },
  { name: 'Italic selection', shortcut: 'Ctrl+I', run: () => applyFormat('italic') },
  { name: 'Code selection', shortcut: 'Ctrl+E', run: () => applyFormat('code') },
  { name: 'Link selection', shortcut: 'Ctrl+L', run: () => applyFormat('link') },
];

function fuzzyScore(text, q) {
  text = text.toLowerCase(); q = q.toLowerCase();
  if (!q) return 1;
  let ti = 0, qi = 0, score = 0, streak = 0;
  while (ti < text.length && qi < q.length) {
    if (text[ti] === q[qi]) { qi++; streak++; score += 1 + streak * 2; }
    else { streak = 0; }
    ti++;
  }
  return qi === q.length ? score : 0;
}

function openPalette() {
  state.palette.open = true; state.palette.cursor = 0;
  els.cmdPalette.classList.remove('hidden');
  els.cmdInput.value = ''; els.cmdInput.focus();
  refreshPalette('');
}
function closePalette() { state.palette.open = false; els.cmdPalette.classList.add('hidden'); }

function refreshPalette(q) {
  const items = [];
  for (const c of PALETTE_COMMANDS) {
    const s = fuzzyScore(c.name, q);
    if (s > 0 || !q) items.push({ kind: 'cmd', label: c.name, hint: c.shortcut, score: s + 5, run: c.run });
  }
  for (const n of state.notes) {
    const title = n.title || 'Untitled';
    const s = fuzzyScore(title, q);
    if (s > 0 || !q) items.push({ kind: 'note', label: title, hint: 'open · ' + fmtDate(n.updated_at), score: s + (n.pinned ? 2 : 0), run: () => openNote(n.id) });
  }
  items.sort((a, b) => b.score - a.score);
  state.palette.items = items.slice(0, 12);
  state.palette.cursor = 0;
  renderPaletteResults();
}
function renderPaletteResults() {
  els.cmdResults.innerHTML = '';
  state.palette.items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'cmd-result' + (i === state.palette.cursor ? ' on' : '');
    const k = document.createElement('span'); k.className = 'cmd-kind'; k.textContent = item.kind === 'cmd' ? '⌘' : '◌';
    const l = document.createElement('span'); l.className = 'cmd-label'; l.textContent = item.label;
    const h = document.createElement('span'); h.className = 'cmd-hint-line'; h.textContent = item.hint;
    li.appendChild(k); li.appendChild(l); li.appendChild(h);
    li.addEventListener('click', () => { closePalette(); item.run(); });
    els.cmdResults.appendChild(li);
  });
}

async function checkForUpdates(quiet) {
  if (!T.updater) { if (!quiet) els.updateStatus.textContent = 'Updater unavailable.'; return; }
  els.updateStatus.textContent = quiet ? '' : 'Checking...'; els.checkUpdateBtn.disabled = true;
  try {
    const u = await checkUpdate();
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
    if (!quiet) els.updateStatus.textContent = 'Cannot reach update server. Use "View releases on GitHub" to check manually.';
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
        case 'Started': total = event.data.contentLength || 0; els.barLabel.textContent = total ? ('Downloading 0 / ' + Math.round(total/1024) + ' KB') : 'Downloading...'; break;
        case 'Progress': downloaded += event.data.chunkLength; if (total) { const pct = Math.min(100, (downloaded / total) * 100); els.barFill.style.width = pct.toFixed(1) + '%'; els.barLabel.textContent = 'Downloading ' + Math.round(downloaded/1024) + ' / ' + Math.round(total/1024) + ' KB'; } break;
        case 'Finished': els.barFill.style.width = '100%'; els.barLabel.textContent = 'Installing...'; break;
      }
    });
    els.barLabel.textContent = 'Restarting...'; await T.process.relaunch();
  } catch (e) {
    els.updateStatus.textContent = 'Install failed: ' + e;
    els.installUpdateBtn.disabled = false; els.skipUpdateBtn.disabled = false;
  }
}
function skipUpdate() { state.pendingUpdate = null; els.updateAvailable.classList.add('hidden'); els.updateStatus.textContent = ''; }
function openReleasesPage() { try { window.open(RELEASES_URL, '_blank', 'noopener'); } catch (e) {} }

document.addEventListener('keydown', (e) => {
  const target = e.target;
  const inField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

  if (state.palette.open) {
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); state.palette.cursor = Math.min(state.palette.cursor + 1, state.palette.items.length - 1); renderPaletteResults(); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); state.palette.cursor = Math.max(state.palette.cursor - 1, 0); renderPaletteResults(); return; }
    if (e.key === 'Enter')     { e.preventDefault(); const it = state.palette.items[state.palette.cursor]; if (it) { closePalette(); it.run(); } return; }
    return;
  }

  if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); newNote(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'd' && !inField) { e.preventDefault(); newDailyNote(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'd' && inField && target === els.title) { e.preventDefault(); newDailyNote(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'm') { e.preventDefault(); togglePreview(); return; }
  if (e.ctrlKey && e.key === 's')               { e.preventDefault(); if (state.pendingTimer) clearTimeout(state.pendingTimer); state.pendingTimer = null; flushSave(); return; }
  if (e.ctrlKey && e.key === '/')               { e.preventDefault(); openCheatsheet(); return; }
  if (target === els.body && e.ctrlKey && e.key.toLowerCase() === 'b') { e.preventDefault(); applyFormat('bold'); return; }
  if (target === els.body && e.ctrlKey && e.key.toLowerCase() === 'i') { e.preventDefault(); applyFormat('italic'); return; }
  if (target === els.body && e.ctrlKey && e.key.toLowerCase() === 'e') { e.preventDefault(); applyFormat('code'); return; }
  if (target === els.body && e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); applyFormat('link'); return; }
  if (e.ctrlKey && e.key === ',')               { e.preventDefault(); cycleTheme(); return; }
  if (e.key === '/' && !inField)                { e.preventDefault(); els.search.focus(); return; }
  if (e.key === 'Escape') {
    if (!els.cheatsheetModal.classList.contains('hidden')) { closeCheatsheet(); return; }
    if (!els.historyModal.classList.contains('hidden')) { closeHistory(); return; }
    if (!els.modalBackdrop.classList.contains('hidden')) { closeSettings(); return; }
    if (!els.selToolbar.classList.contains('hidden')) { hideSelToolbar(); return; }
    if (target === els.search) { els.search.value = ''; state.query = ''; loadNotes(); els.search.blur(); }
  }
});

els.newNote.addEventListener('click', newNote);
els.themeBtn.addEventListener('click', cycleTheme);
els.cmdBtn.addEventListener('click', openPalette);
els.deleteBtn.addEventListener('click', deleteActive);
els.pinBtn.addEventListener('click', togglePin);
els.previewBtn.addEventListener('click', togglePreview);
els.exportBtn.addEventListener('click', exportActiveMd);
els.title.addEventListener('input', scheduleSave);
els.body.addEventListener('input', scheduleSave);
els.search.addEventListener('input', () => {
  state.query = els.search.value;
  els.saveSearchBtn.hidden = !state.query.trim();
  clearTimeout(els._searchTimer);
  els._searchTimer = setTimeout(loadNotes, 150);
});
els.saveSearchBtn.addEventListener('click', saveCurrentSearch);
els.settingsBtn.addEventListener('click', () => openSettings('general'));
els.modalClose.addEventListener('click', closeSettings);
els.modalBackdrop.addEventListener('click', (e) => { if (e.target === els.modalBackdrop) closeSettings(); });
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
els.optAutoUpdate.addEventListener('change', saveSettings);
els.optDefaultPreview.addEventListener('change', saveSettings);
els.optShowBacklinks.addEventListener('change', saveSettings);
els.checkUpdateBtn.addEventListener('click', () => checkForUpdates(false));
els.installUpdateBtn.addEventListener('click', installUpdate);
els.skipUpdateBtn.addEventListener('click', skipUpdate);
els.openReleasesBtn.addEventListener('click', openReleasesPage);

els.activeThemeSelect.addEventListener('change', () => { const id = els.activeThemeSelect.value; applyTheme(id); state.settings.theme = id; saveSettings(); renderThemeList(); });
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
els.importMdBtn.addEventListener('click', importMdFile);
els.exportAllBtn.addEventListener('click', exportAllMd);

els.viewAll.addEventListener('click', openAllNotes);
els.viewTrash.addEventListener('click', openTrash);
els.emptyTrashBtn.addEventListener('click', emptyTrash);

els.cmdInput.addEventListener('input', () => refreshPalette(els.cmdInput.value));
els.cmdPalette.addEventListener('click', (e) => { if (e.target === els.cmdPalette) closePalette(); });

els.outlineBtn.addEventListener('click', toggleOutline);
els.newFromTemplate.addEventListener('click', (e) => { e.stopPropagation(); openTemplateMenu(els.newFromTemplate); });
els.saveTemplateBtn.addEventListener('click', saveActiveAsTemplate);

els.noteList.addEventListener('contextmenu', (e) => {
  let li = e.target;
  while (li && li.tagName !== 'LI') li = li.parentElement;
  if (!li) return;
  const idx = Array.from(els.noteList.children).indexOf(li);
  let visible = state.notes;
  if (state.activeTag) visible = visible.filter(n => (n.tags || []).includes(state.activeTag));
  const note = visible[idx];
  if (!note) return;
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, note);
});

document.addEventListener('click', (e) => {
  if (!els.ctxMenu.classList.contains('hidden') && !els.ctxMenu.contains(e.target)) hideMenus();
  if (!els.templateMenu.classList.contains('hidden') && !els.templateMenu.contains(e.target) && e.target !== els.newFromTemplate) hideMenus();
});

els.historyBtn.addEventListener('click', openHistory);
els.hmClose.addEventListener('click', closeHistory);
els.historyModal.addEventListener('click', (e) => { if (e.target === els.historyModal) closeHistory(); });
els.hmPurgeBtn.addEventListener('click', purgeHistoryActive);
els.attachBtn.addEventListener('click', pickAttachment);
els.exportWorkspaceBtn.addEventListener('click', exportWorkspace);
els.importWorkspaceBtn.addEventListener('click', importWorkspace);

els.body.addEventListener('paste', async (e) => {
  if (!e.clipboardData) return;
  const items = Array.from(e.clipboardData.items || []);
  for (const it of items) {
    if (it.kind === 'file') {
      const f = it.getAsFile();
      if (f) { e.preventDefault(); await attachFile(f); return; }
    }
  }
});
els.body.addEventListener('dragover', (e) => { e.preventDefault(); els.body.classList.add('drop-target'); });
els.body.addEventListener('dragleave', () => els.body.classList.remove('drop-target'));
els.body.addEventListener('drop', async (e) => {
  e.preventDefault();
  els.body.classList.remove('drop-target');
  const files = Array.from(e.dataTransfer.files || []);
  for (const f of files) await attachFile(f);
});

document.addEventListener('selectionchange', () => {
  if (document.activeElement === els.body) {
    if (els.body.selectionStart !== els.body.selectionEnd) {
      requestAnimationFrame(showSelToolbar);
    } else {
      hideSelToolbar();
    }
  }
});
els.body.addEventListener('blur', (e) => {
  setTimeout(() => {
    if (!els.selToolbar.contains(document.activeElement)) hideSelToolbar();
  }, 100);
});
els.selToolbar.querySelectorAll('button[data-fmt]').forEach(b => {
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', () => { applyFormat(b.dataset.fmt); requestAnimationFrame(showSelToolbar); });
});

els.csClose.addEventListener('click', closeCheatsheet);
els.cheatsheetModal.addEventListener('click', (e) => { if (e.target === els.cheatsheetModal) closeCheatsheet(); });

els.optSpellCheck.addEventListener('change', saveSettings);
els.optSort.addEventListener('change', () => { saveSettings(); renderList(); });

window.addEventListener('beforeunload', () => {
  if (state.pendingTimer) { clearTimeout(state.pendingTimer); flushSave(); }
  for (const w of state.pluginWorkers.values()) { try { w.terminate(); } catch (e) {} }
});

els.lockUnlockBtn.addEventListener('click', attemptUnlock);
els.lockPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptUnlock(); });

(async () => {
  if (!T) { document.body.innerHTML = '<div style="padding:32px;color:#e6e6e6;background:#0e0f12;font-family:sans-serif">Tauri runtime not available. Please re-install.</div>'; return; }
  await loadSettings();
  await loadThemes();
  applyTheme(state.settings.theme || 'dark');
  await loadPlugins();
  try { const info = await invoke('app_info'); els.version.textContent = 'v' + info.version; els.aboutVersion.textContent = 'v' + info.version; } catch (e) {}
  await refreshLockUi();
  if (!state.locked) {
    await loadTemplates();
    await loadNotes();
  }
  showView('empty');
  setStatus('ready');
  if (state.settings.auto_check_updates) setTimeout(() => checkForUpdates(true), 2500);
})();
