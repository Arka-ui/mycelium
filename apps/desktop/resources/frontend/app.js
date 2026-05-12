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
  'dash-grid','dash-tags','dash-cal','dash-graph','dash-refresh-btn',
  'backlinks-panel','backlinks-list','stat-words','stat-chars','stat-read',
  'modal-backdrop','modal-close','opt-auto-update','opt-default-preview','opt-show-backlinks','check-update-btn','update-status','update-available','update-version','update-notes','install-update-btn','skip-update-btn','update-progress','bar-fill','bar-label','about-version','open-releases-btn',
  'active-theme-select','open-theme-editor-btn','open-data-btn','theme-list','new-theme-btn','import-theme-btn',
  'theme-editor','te-name','te-id','te-colors','te-radius','te-radius-sm','te-font','te-font-size','te-save-btn','te-export-btn','te-cancel-btn','te-delete-btn',
  'plugin-list','install-plugin-btn','open-plugins-folder-btn',
  'import-md-btn','export-all-btn',
  'cmd-palette','cmd-input','cmd-results',
  'file-input',
  'opt-locale','opt-auto-pair','opt-smart-lists','opt-strip-trailing-ws','opt-word-wrap','opt-smart-typography','opt-editor-font-size','reading-btn','print-btn',
  'view-orphans','view-tasks','tasks-badge','tasks-pane','tasks-list','tasks-include-done','tasks-refresh-btn',
  'outgoing-list','suggested-list','mentions-list',
  'props-strip',
  'opt-quick-capture','quick-capture-row','quick-capture-input','copy-md-btn','import-md-multi-btn',
  'filter-pill','filter-pill-text','filter-pill-count','filter-pill-clear',
  'today-section','today-toggle','today-caret','today-count','today-list',
  'opt-auto-wiki-link','opt-pomodoro','pomodoro','opt-auto-lock-idle','opt-sync-scroll',
  'sidebar','sidebar-divider','sidebar-toggle','sidebar-hide-btn',
  'tab-bar',
  'search-modal','search-modal-input','search-modal-results',
  'diff-modal','diff-close','diff-meta','diff-body',
  'props-modal','props-close','props-rows','props-add-btn','props-save-btn','props-btn',
  'nav-back-btn','nav-fwd-btn',
  'shortcuts-rows',
  'stat-goal','trash-badge','opt-trash-days','purge-now-btn',
  'snip-rows','snip-add-btn','snip-save-btn','snip-reset-btn',
  'export-workspace-enc-btn','opt-backup-reminder','last-backup-text',
  'board-property-input','board-refresh-btn','board-grid',
  'cal-prev-btn','cal-today-btn','cal-next-btn','cal-label','cal-property-input','cal-grid',
  'bulk-bar','bulk-count','bulk-pin','bulk-unpin','bulk-export','bulk-merge','bulk-prop','bulk-trash','bulk-clear',
  'find-bar','find-input','replace-input','find-next-btn','find-replace-btn','find-replace-all-btn','find-count','find-close-btn',
].forEach(id => { els[toCamel(id)] = document.getElementById(id); });
function toCamel(s) { return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }

const state = {
  notes: [], activeId: null, active: null, pendingTimer: null,
  query: '', activeTag: null, view: 'all', preview: false,
  outlineOpen: false, templates: [],
  themes: [], activeThemeId: 'dark', editingTheme: null,
  plugins: [], pluginWorkers: new Map(), pluginCommands: new Map(),
  pendingUpdate: null,
  settings: { auto_check_updates: true, theme: 'dark', enabled_plugins: [], default_preview: false, show_backlinks: true, locale: 'en' },
  palette: { open: false, items: [], cursor: 0 },
  selectedIds: new Set(),
  selectionAnchorId: null,
  find: { open: false, lastIndex: -1 },
  reading: false,
  recents: [],
  tabs: [], // v0.29 — array of open note ids; activeId is always the focused one if present
  navStack: [],   // v0.57 — back/forward history (note ids)
  navIndex: -1,   // current position in navStack
  navSilent: false,
};

// v0.39 — Snapshot diff viewer (LCS-based unified line diff)
function openDiffModal(historyEntry, oldBody, newBody) {
  if (!els.diffModal) return;
  els.diffMeta.textContent = `Snapshot: ${new Date(historyEntry.timestamp).toLocaleString()} · ${historyEntry.title || 'Untitled'}`;
  const diff = unifiedLineDiff(oldBody, newBody);
  els.diffBody.innerHTML = diff;
  els.diffModal.classList.remove('hidden');
}
function closeDiffModal() { if (els.diffModal) els.diffModal.classList.add('hidden'); }

// v0.53 — Note properties form editor
state.propsForm = [];
async function openPropsModal() {
  if (!state.activeId) { alert('Open a note first.'); return; }
  if (!els.propsModal) return;
  let props = {};
  try { props = await invoke('note_properties', { id: state.activeId }); }
  catch (_) { props = {}; }
  state.propsForm = Object.entries(props || {}).map(([k, v]) => ({ key: k, value: String(v == null ? '' : v) }));
  if (state.propsForm.length === 0) state.propsForm.push({ key: '', value: '' });
  renderPropsForm();
  els.propsModal.classList.remove('hidden');
}
function closePropsModal() { if (els.propsModal) els.propsModal.classList.add('hidden'); }
function renderPropsForm() {
  if (!els.propsRows) return;
  els.propsRows.innerHTML = '';
  for (let i = 0; i < state.propsForm.length; i++) {
    const row = state.propsForm[i];
    const tr = document.createElement('tr');
    const tdK = document.createElement('td');
    const inK = document.createElement('input'); inK.type = 'text'; inK.className = 'text-input snip-key';
    inK.value = row.key; inK.addEventListener('input', () => { row.key = inK.value; });
    tdK.appendChild(inK);
    const tdV = document.createElement('td');
    const inV = document.createElement('input'); inV.type = 'text'; inV.className = 'text-input snip-desc';
    inV.value = row.value; inV.addEventListener('input', () => { row.value = inV.value; });
    tdV.appendChild(inV);
    const tdA = document.createElement('td');
    const del = document.createElement('button'); del.className = 'danger-btn'; del.textContent = '×';
    del.addEventListener('click', () => { state.propsForm.splice(i, 1); renderPropsForm(); });
    tdA.appendChild(del);
    tr.appendChild(tdK); tr.appendChild(tdV); tr.appendChild(tdA);
    els.propsRows.appendChild(tr);
  }
}
async function savePropsForm() {
  if (!state.activeId) return;
  // Determine current keys from the form and from the existing frontmatter; remove any
  // keys that vanished, then upsert remaining rows.
  let existing = {};
  try { existing = await invoke('note_properties', { id: state.activeId }) || {}; }
  catch (_) {}
  const formKeysLc = new Set();
  for (const r of state.propsForm) {
    const k = (r.key || '').trim();
    if (!k) continue;
    formKeysLc.add(k.toLowerCase());
  }
  // Remove keys that were dropped from the form.
  for (const k of Object.keys(existing)) {
    if (!formKeysLc.has(k.toLowerCase())) {
      try { await invoke('set_property', { id: state.activeId, key: k, value: null }); }
      catch (_) {}
    }
  }
  // Upsert each row.
  for (const r of state.propsForm) {
    const k = (r.key || '').trim();
    if (!k) continue;
    try { await invoke('set_property', { id: state.activeId, key: k, value: r.value }); }
    catch (e) { alert('Save failed for ' + k + ': ' + e); return; }
  }
  closePropsModal();
  await loadNotes();
  if (state.activeId) await openNote(state.activeId);
  setStatus('Properties saved.');
}

// v0.44 — compare two notes (uses the same diff modal as snapshot diff).
async function compareWithNote() {
  if (!state.activeId) { alert('Open a note first.'); return; }
  const cur = state.active;
  const candidates = (state._allNotesCache && state._allNotesCache.length ? state._allNotesCache : state.notes)
    .filter(n => n.id !== state.activeId && !n.trashed_at)
    .sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()));
  if (!candidates.length) { alert('No other notes to compare with.'); return; }
  const list = candidates.slice(0, 30).map((n, i) => `${i + 1}. ${n.title || 'Untitled'}`).join('\n');
  const moreNote = candidates.length > 30 ? `\n…and ${candidates.length - 30} more (type a title or substring instead).` : '';
  const ans = prompt(`Compare "${cur.title || 'Untitled'}" against:\n\n${list}${moreNote}\n\nEnter a number, or type any title / substring:`);
  if (ans == null) return;
  let target = null;
  const numIdx = parseInt(ans, 10);
  if (!Number.isNaN(numIdx) && numIdx >= 1 && numIdx <= candidates.length) {
    target = candidates[numIdx - 1];
  } else {
    const lc = ans.trim().toLowerCase();
    target = candidates.find(n => (n.title || '').toLowerCase() === lc)
          || candidates.find(n => (n.title || '').toLowerCase().includes(lc));
  }
  if (!target) { alert('No matching note.'); return; }
  let other;
  try { other = await invoke('get_note', { id: target.id }); }
  catch (e) { alert('Load failed: ' + e); return; }
  if (!other) { alert('Note vanished.'); return; }
  // Reuse the diff modal but with a "compare" header.
  if (!els.diffModal) return;
  els.diffMeta.textContent = `Comparing "${cur.title || 'Untitled'}" → "${other.title || 'Untitled'}" (current → other)`;
  els.diffBody.innerHTML = unifiedLineDiff(cur.body || '', other.body || '');
  els.diffModal.classList.remove('hidden');
}

// LCS-based diff over lines, returns HTML with .add / .del / .ctx spans.
function unifiedLineDiff(a, b) {
  const A = a.split('\n');
  const B = b.split('\n');
  // LCS table (size m+1 x n+1).
  const m = A.length, n = B.length;
  // Build LCS lengths.
  const lcs = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = A[i] === B[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (A[i] === B[j]) { out.push({ kind: 'ctx', line: A[i] }); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { out.push({ kind: 'del', line: A[i] }); i++; }
    else { out.push({ kind: 'add', line: B[j] }); j++; }
  }
  while (i < m) { out.push({ kind: 'del', line: A[i++] }); }
  while (j < n) { out.push({ kind: 'add', line: B[j++] }); }
  // Render to HTML; collapse runs of >5 unchanged lines into "@@ N lines unchanged @@".
  const RUN = 5;
  let buf = '';
  let unchanged = [];
  function flushUnchanged() {
    if (!unchanged.length) return;
    if (unchanged.length > RUN * 2) {
      // Print first RUN, "@@ N hidden @@", last RUN.
      for (const u of unchanged.slice(0, RUN)) buf += '<span class="ctx">  ' + escapeHtml(u) + '</span>\n';
      buf += '<span class="cut">@@ ' + (unchanged.length - RUN * 2) + ' unchanged lines @@</span>\n';
      for (const u of unchanged.slice(unchanged.length - RUN)) buf += '<span class="ctx">  ' + escapeHtml(u) + '</span>\n';
    } else {
      for (const u of unchanged) buf += '<span class="ctx">  ' + escapeHtml(u) + '</span>\n';
    }
    unchanged = [];
  }
  for (const o of out) {
    if (o.kind === 'ctx') { unchanged.push(o.line); continue; }
    flushUnchanged();
    if (o.kind === 'add') buf += '<span class="add">+ ' + escapeHtml(o.line) + '</span>\n';
    else                  buf += '<span class="del">- ' + escapeHtml(o.line) + '</span>\n';
  }
  flushUnchanged();
  return buf || '<span class="ctx">(notes are identical)</span>';
}

// v0.30 — Search-everywhere modal
state.searchModal = { open: false, items: [], cursor: 0, debounce: null };
function openSearchModal() {
  if (!els.searchModal) return;
  state.searchModal.open = true;
  state.searchModal.items = [];
  state.searchModal.cursor = 0;
  els.searchModal.classList.remove('hidden');
  els.searchModalInput.value = state.query && state.query.trim() ? state.query.trim() : '';
  setTimeout(() => { els.searchModalInput.focus(); els.searchModalInput.select(); refreshSearchModal(); }, 30);
}
function closeSearchModal() {
  state.searchModal.open = false;
  if (els.searchModal) els.searchModal.classList.add('hidden');
}
async function refreshSearchModal() {
  const q = (els.searchModalInput.value || '').trim();
  els.searchModalResults.innerHTML = '';
  if (!q) {
    const li = document.createElement('li');
    li.className = 'search-empty'; li.textContent = 'Type to search every note (title and body)';
    els.searchModalResults.appendChild(li);
    state.searchModal.items = [];
    return;
  }
  let hits = [];
  try { hits = await invoke('search_notes', { query: q }); }
  catch (e) {
    const li = document.createElement('li');
    li.className = 'search-error'; li.textContent = 'Search failed: ' + e;
    els.searchModalResults.appendChild(li);
    return;
  }
  state.searchModal.items = hits;
  state.searchModal.cursor = 0;
  if (!hits.length) {
    const li = document.createElement('li');
    li.className = 'search-empty'; li.textContent = 'No matches.';
    els.searchModalResults.appendChild(li);
    return;
  }
  hits.forEach((h, idx) => {
    const li = document.createElement('li');
    li.className = 'search-result' + (idx === 0 ? ' on' : '');
    const t = document.createElement('div'); t.className = 'sr-title';
    t.textContent = (h.pinned ? '★ ' : '') + (h.title || 'Untitled');
    li.appendChild(t);
    if (h.snippet) {
      const s = document.createElement('div'); s.className = 'sr-snippet';
      s.innerHTML = highlightQuery(h.snippet, q);
      li.appendChild(s);
    }
    const meta = document.createElement('div'); meta.className = 'sr-meta';
    meta.textContent = (h.match_in_body ? 'in body · ' : 'in title · ') + fmtDate(h.updated_at);
    li.appendChild(meta);
    li.addEventListener('click', () => { closeSearchModal(); openNote(h.id); });
    els.searchModalResults.appendChild(li);
  });
}
function highlightQuery(text, q) {
  if (!q) return escapeHtml(text);
  const lc = text.toLowerCase();
  const lq = q.toLowerCase();
  let out = '';
  let i = 0;
  while (i < text.length) {
    const at = lc.indexOf(lq, i);
    if (at < 0) { out += escapeHtml(text.slice(i)); break; }
    out += escapeHtml(text.slice(i, at)) + '<mark>' + escapeHtml(text.slice(at, at + q.length)) + '</mark>';
    i = at + q.length;
  }
  return out;
}
function moveSearchCursor(delta) {
  if (!state.searchModal.items.length) return;
  state.searchModal.cursor = Math.max(0, Math.min(state.searchModal.items.length - 1, state.searchModal.cursor + delta));
  Array.from(els.searchModalResults.children).forEach((li, i) => li.classList.toggle('on', i === state.searchModal.cursor));
  const sel = els.searchModalResults.children[state.searchModal.cursor];
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}
function activateSearchSelection() {
  const it = state.searchModal.items[state.searchModal.cursor];
  if (!it) return;
  closeSearchModal(); openNote(it.id);
}

// v0.29 — tab persistence
const TABS_KEY = 'mycelium.tabs.v1';
function loadTabs() {
  try { state.tabs = JSON.parse(localStorage.getItem(TABS_KEY) || '[]') || []; }
  catch (_) { state.tabs = []; }
}
function saveTabs() {
  try { localStorage.setItem(TABS_KEY, JSON.stringify(state.tabs)); } catch (_) {}
}
function addTab(id) {
  if (!id) return;
  if (!state.tabs.includes(id)) state.tabs.push(id);
  saveTabs();
  renderTabs();
}
function closeTab(id) {
  const idx = state.tabs.indexOf(id);
  if (idx < 0) return;
  state.tabs.splice(idx, 1);
  saveTabs();
  if (state.activeId === id) {
    const fallback = state.tabs[idx] || state.tabs[idx - 1] || null;
    if (fallback) openNote(fallback); else { showEmpty(); renderTabs(); }
    return;
  }
  renderTabs();
}
function cycleTab(delta) {
  if (!state.tabs.length) return;
  const i = Math.max(0, state.tabs.indexOf(state.activeId));
  const next = state.tabs[(i + delta + state.tabs.length) % state.tabs.length];
  if (next) openNote(next);
}
function renderTabs() {
  if (!els.tabBar) return;
  if (!state.tabs.length) { els.tabBar.classList.add('hidden'); els.tabBar.innerHTML = ''; return; }
  els.tabBar.classList.remove('hidden');
  els.tabBar.innerHTML = '';
  for (const id of state.tabs) {
    const meta = state.notes.find(n => n.id === id);
    const tab = document.createElement('button');
    tab.className = 'tab' + (id === state.activeId ? ' active' : '');
    tab.dataset.id = id;
    const label = document.createElement('span'); label.className = 'tab-label';
    let txt = (meta && meta.title) || 'Untitled';
    if (meta && meta.icon && meta.icon.length <= 4) txt = meta.icon + ' ' + txt;
    label.textContent = txt;
    tab.appendChild(label);
    const x = document.createElement('span'); x.className = 'tab-x'; x.textContent = '×';
    x.addEventListener('click', (e) => { e.stopPropagation(); closeTab(id); });
    tab.appendChild(x);
    tab.addEventListener('click', () => openNote(id));
    tab.addEventListener('mousedown', (e) => { if (e.button === 1) { e.preventDefault(); closeTab(id); } });
    els.tabBar.appendChild(tab);
  }
}

// v0.12 — recently opened notes (most recent first), capped at 10.
const RECENTS_KEY = 'mycelium.recents.v1';
function loadRecents() {
  try { state.recents = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]') || []; }
  catch (_) { state.recents = []; }
}
function pushRecent(id) {
  if (!id) return;
  state.recents = [id, ...state.recents.filter(x => x !== id)].slice(0, 10);
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(state.recents)); } catch (_) {}
}

// --- i18n ---------------------------------------------------------------
// Baseline English strings live in code as the fallback in t(). Other locales
// merge in from window.MYCELIUM_TRANSLATIONS, which a community-contributed
// translations.json (loaded later) can populate. This is intentionally a
// thin layer in v0.10 — full string coverage rolls out in v0.11+.
window.MYCELIUM_TRANSLATIONS = window.MYCELIUM_TRANSLATIONS || { en: {} };
function t(key, fallback) {
  try {
    const loc = (state.settings && state.settings.locale) || 'en';
    const tbl = window.MYCELIUM_TRANSLATIONS[loc] || {};
    if (tbl[key]) return tbl[key];
  } catch (_) {}
  return fallback != null ? fallback : key;
}

const THEMES = ['dark', 'light', 'hc'];

function setStatus(s) { els.status.textContent = s; }
// v0.51 — colored save status dot/state
function setSaveState(s) {
  if (!els.saveState) return;
  els.saveState.textContent = s;
  els.saveState.classList.remove('save-saved', 'save-saving', 'save-error');
  if (s === 'saved') els.saveState.classList.add('save-saved');
  else if (s === 'saving...' || s === 'editing...') els.saveState.classList.add('save-saving');
  else if (s === 'save failed') els.saveState.classList.add('save-error');
}

// v0.59 — Custom keyboard shortcuts editor + matcher.
function normalizeShortcut(e) {
  const parts = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  if (e.metaKey) parts.push('Meta');
  let key = e.key;
  if (!key) return null;
  // Don't bind bare modifiers
  if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') return null;
  if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return parts.join('+');
}
function renderShortcutsTable() {
  if (!els.shortcutsRows) return;
  els.shortcutsRows.innerHTML = '';
  const map = (state.settings && state.settings.custom_shortcuts) || {};
  for (const cmd of PALETTE_COMMANDS) {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td'); tdName.textContent = cmd.name;
    tr.appendChild(tdName);
    const tdBind = document.createElement('td');
    const cur = map[cmd.name] || '';
    if (cur) {
      const k = document.createElement('kbd'); k.textContent = cur; tdBind.appendChild(k);
    } else if (cmd.shortcut) {
      const def = document.createElement('span'); def.style.color = 'var(--text-3)';
      def.textContent = '(default: ' + cmd.shortcut + ')'; tdBind.appendChild(def);
    } else {
      tdBind.textContent = '';
    }
    tr.appendChild(tdBind);
    const tdAct = document.createElement('td');
    const setBtn = document.createElement('button'); setBtn.className = 'ghost-btn'; setBtn.textContent = cur ? 'Change' : 'Set...';
    setBtn.addEventListener('click', () => beginShortcutCapture(cmd.name, setBtn));
    tdAct.appendChild(setBtn);
    if (cur) {
      const clr = document.createElement('button'); clr.className = 'danger-btn'; clr.textContent = 'Clear';
      clr.style.marginLeft = '6px';
      clr.addEventListener('click', async () => {
        const m = { ...(state.settings.custom_shortcuts || {}) };
        delete m[cmd.name];
        state.settings.custom_shortcuts = m;
        try { await invoke('set_settings', { settings: state.settings }); } catch (_) {}
        renderShortcutsTable();
      });
      tdAct.appendChild(clr);
    }
    tr.appendChild(tdAct);
    els.shortcutsRows.appendChild(tr);
  }
}
function beginShortcutCapture(cmdName, btn) {
  btn.textContent = 'Press keys… (Esc to cancel)';
  btn.style.background = 'var(--accent)';
  btn.style.color = 'var(--accent-fg)';
  const handler = async (e) => {
    if (e.key === 'Escape') {
      cleanup();
      renderShortcutsTable();
      return;
    }
    const k = normalizeShortcut(e);
    if (!k) return; // ignore bare modifiers
    e.preventDefault();
    e.stopPropagation();
    const m = { ...(state.settings.custom_shortcuts || {}) };
    m[cmdName] = k;
    state.settings.custom_shortcuts = m;
    try { await invoke('set_settings', { settings: state.settings }); } catch (_) {}
    cleanup();
    renderShortcutsTable();
  };
  function cleanup() {
    document.removeEventListener('keydown', handler, true);
    btn.style.background = ''; btn.style.color = '';
  }
  document.addEventListener('keydown', handler, true);
}
// Match a normalised key against all bound custom shortcuts and run the matched command.
function tryRunCustomShortcut(e) {
  const map = state.settings && state.settings.custom_shortcuts;
  if (!map) return false;
  const want = normalizeShortcut(e);
  if (!want) return false;
  for (const [name, key] of Object.entries(map)) {
    if (key === want) {
      const cmd = PALETTE_COMMANDS.find(c => c.name === name);
      if (cmd) { e.preventDefault(); cmd.run(); return true; }
    }
  }
  return false;
}

// v0.57 — Browser-style back / forward navigation across opened notes.
function pushNav(id) {
  if (state.navSilent) return;
  // Drop any forward history past current index
  state.navStack = state.navStack.slice(0, state.navIndex + 1);
  // Avoid duplicate consecutive entries
  if (state.navStack[state.navStack.length - 1] !== id) {
    state.navStack.push(id);
    if (state.navStack.length > 80) state.navStack.shift();
    state.navIndex = state.navStack.length - 1;
  }
  refreshNavButtons();
}
function refreshNavButtons() {
  if (els.navBackBtn) els.navBackBtn.disabled = state.navIndex <= 0;
  if (els.navFwdBtn)  els.navFwdBtn.disabled  = state.navIndex >= state.navStack.length - 1;
}
async function navBack() {
  if (state.navIndex <= 0) return;
  state.navIndex -= 1;
  state.navSilent = true;
  try { await openNote(state.navStack[state.navIndex]); }
  finally { state.navSilent = false; refreshNavButtons(); }
}
async function navForward() {
  if (state.navIndex >= state.navStack.length - 1) return;
  state.navIndex += 1;
  state.navSilent = true;
  try { await openNote(state.navStack[state.navIndex]); }
  finally { state.navSilent = false; refreshNavButtons(); }
}

// v0.51 — Per-note local draft (persists every keystroke; restored if newer than file).
const DRAFTS_KEY = 'mycelium.drafts.v1';
function loadDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}') || {}; }
  catch (_) { return {}; }
}
function saveDrafts(map) {
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(map)); } catch (_) {}
}
function rememberDraft(id, body) {
  if (!id) return;
  const map = loadDrafts();
  map[id] = { body, ts: Date.now() };
  saveDrafts(map);
}
function clearDraft(id) {
  const map = loadDrafts();
  if (map[id]) { delete map[id]; saveDrafts(map); }
}
function getDraft(id) {
  const map = loadDrafts();
  return map[id] || null;
}
// v0.49 — short human-readable duration from minutes
function fmtMinutes(m) {
  if (m < 60) return m + ' min';
  if (m < 60 * 24) {
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }
  const d = Math.floor(m / (60 * 24)), r = m % (60 * 24);
  const h = Math.floor(r / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
}

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
      refreshAllNotesCache();
    } else {
      state.notes = await invoke('list_notes');
      state._allNotesCache = state.notes;
    }
    renderList();
    renderTagBar();
    refreshTrashBadge();
    refreshFilterPill(); // v0.46
    refreshTodaySection(); // v0.48
    // v0.50 — open task count chip in sidebar Tasks button (best-effort).
    invoke('all_tasks', { includeDone: false })
      .then(t => refreshTasksBadge(t.length))
      .catch(() => {});
  } catch (e) { setStatus('error: ' + e); console.error(e); }
}

// v0.48 — "Today" section in the sidebar showing every note touched today (local TZ).
const TODAY_COLLAPSED_KEY = 'mycelium.today_collapsed.v1';
function isTodayCollapsed() {
  try { return localStorage.getItem(TODAY_COLLAPSED_KEY) === '1'; } catch (_) { return false; }
}
function setTodayCollapsed(v) {
  try { localStorage.setItem(TODAY_COLLAPSED_KEY, v ? '1' : '0'); } catch (_) {}
}
function refreshTodaySection() {
  if (!els.todaySection) return;
  // Use today's local-date as YYYY-MM-DD; compare against the prefix of n.updated_at (UTC ISO).
  // To avoid a timezone mismatch we compare the local-date prefix of `Date(updated_at)`.
  const todayLocal = new Date();
  const y = todayLocal.getFullYear();
  const m = String(todayLocal.getMonth() + 1).padStart(2, '0');
  const d = String(todayLocal.getDate()).padStart(2, '0');
  const key = `${y}-${m}-${d}`;
  const pool = (state._allNotesCache && state._allNotesCache.length ? state._allNotesCache : state.notes) || [];
  const today = pool.filter(n => {
    if (n.trashed_at) return false;
    if (!n.updated_at) return false;
    const dt = new Date(n.updated_at);
    if (isNaN(dt.getTime())) return false;
    const ly = dt.getFullYear();
    const lm = String(dt.getMonth() + 1).padStart(2, '0');
    const ld = String(dt.getDate()).padStart(2, '0');
    return `${ly}-${lm}-${ld}` === key;
  }).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  if (!today.length) {
    els.todaySection.classList.add('hidden');
    return;
  }
  els.todaySection.classList.remove('hidden');
  els.todayCount.textContent = today.length;
  const collapsed = isTodayCollapsed();
  els.todayCaret.textContent = collapsed ? '▸' : '▾';
  els.todayList.classList.toggle('hidden', collapsed);
  if (!collapsed) {
    els.todayList.innerHTML = '';
    for (const n of today.slice(0, 10)) {
      const li = document.createElement('li');
      li.className = 'today-item' + (n.id === state.activeId ? ' active' : '');
      const title = n.title && n.title.trim() ? n.title : 'Untitled';
      const t = document.createElement('span'); t.className = 'today-item-title';
      t.textContent = (n.icon && n.icon.length <= 4 ? n.icon + ' ' : '') + title;
      li.appendChild(t);
      const ts = document.createElement('span'); ts.className = 'today-item-time';
      ts.textContent = fmtDate(n.updated_at);
      li.appendChild(ts);
      li.addEventListener('click', () => openNote(n.id));
      els.todayList.appendChild(li);
    }
    if (today.length > 10) {
      const more = document.createElement('li');
      more.className = 'today-item today-more';
      more.textContent = `+${today.length - 10} more in the main list below`;
      els.todayList.appendChild(more);
    }
  }
}
if (els.todayToggle) {
  els.todayToggle.addEventListener('click', () => {
    setTodayCollapsed(!isTodayCollapsed());
    refreshTodaySection();
  });
}

// v0.46 — sticky pill above the note list summarising the active filter.
// The pill knows about: search query, tag filter, orphans view, and property filter.
function refreshFilterPill() {
  if (!els.filterPill) return;
  let label = '';
  if (state.query && state.query.trim()) label = 'Search: ' + state.query.trim();
  else if (state.activeTag) label = 'Tag: #' + state.activeTag;
  else if (state.view === 'orphans') label = 'Orphans (no in/out wiki-links)';
  else if (state.view === 'props') label = 'Property filter';
  if (!label) {
    els.filterPill.classList.add('hidden');
    return;
  }
  els.filterPill.classList.remove('hidden');
  els.filterPillText.textContent = label;
  let visible = state.notes;
  if (state.activeTag) visible = visible.filter(n => (n.tags || []).includes(state.activeTag));
  els.filterPillCount.textContent = visible.length + (visible.length === 1 ? ' note' : ' notes');
}
function clearActiveFilter() {
  state.query = '';
  if (els.search) els.search.value = '';
  state.activeTag = null;
  if (state.view === 'orphans' || state.view === 'props') {
    state.view = 'all';
    document.querySelectorAll('.side-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'all'));
  }
  loadNotes();
}

// v0.34 — show count badge on the Trash sidebar tab.
async function refreshTrashBadge() {
  if (!els.trashBadge) return;
  try {
    const n = await invoke('trash_count');
    if (n > 0) { els.trashBadge.classList.remove('hidden'); els.trashBadge.textContent = String(n); }
    else { els.trashBadge.classList.add('hidden'); els.trashBadge.textContent = ''; }
  } catch (_) { /* silent */ }
}

// v0.34 — purge eligible trash now (button + boot).
async function purgeEligibleTrash() {
  const days = state.settings.trash_purge_days || 0;
  if (days <= 0) return 0;
  try {
    const n = await invoke('auto_purge_trash', { days });
    if (n > 0) setStatus('Auto-purged ' + n + ' trashed note' + (n === 1 ? '' : 's') + '.');
    return n;
  } catch (_) { return 0; }
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
    li.textContent = state.query ? t('list.no_matches', 'No matches.') : state.activeTag ? t('list.no_with_tag', 'No notes with #') + state.activeTag : t('list.empty', 'No notes yet. Click "+ New note".');
    els.noteList.appendChild(li);
    state._visibleNotes = [];
    return;
  }
  state._visibleNotes = items;
  for (const n of items) {
    const li = document.createElement('li');
    if (n.id === state.activeId) li.classList.add('active');
    if (n.pinned) li.classList.add('pinned');
    if (state.selectedIds.has(n.id)) li.classList.add('selected');
    li.dataset.id = n.id;
    // v0.28 — sidebar color bar from frontmatter `color:`.
    if (n.color && isSafeCssColor(n.color)) {
      li.style.borderLeft = '3px solid ' + n.color;
      li.style.paddingLeft = '7px';
    }

    if (n.pinned) {
      // HTML5 drag handle on pinned rows so we can manually order them.
      li.draggable = true;
      li.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/x-mycelium-note-id', n.id);
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', (e) => {
        if (e.dataTransfer.types.includes('text/x-mycelium-note-id')) {
          e.preventDefault();
          li.classList.add('drop-above');
        }
      });
      li.addEventListener('dragleave', () => li.classList.remove('drop-above'));
      li.addEventListener('drop', async (e) => {
        e.preventDefault();
        li.classList.remove('drop-above');
        const draggedId = e.dataTransfer.getData('text/x-mycelium-note-id');
        if (!draggedId || draggedId === n.id) return;
        await reorderPinnedDrop(draggedId, n.id);
      });
    }

    const titleRow = document.createElement('div'); titleRow.className = 'nl-row-title';
    const ti = document.createElement('span'); ti.className = 'nl-title';
    // v0.28 — frontmatter `icon:` shown before the title (single short string).
    let titleText = n.title && n.title.trim() ? n.title : t('untitled', 'Untitled');
    if (n.icon && n.icon.length <= 8) titleText = n.icon + ' ' + titleText;
    ti.textContent = titleText;
    if (n.pinned) {
      const star = document.createElement('span'); star.className = 'nl-pin'; star.textContent = '★';
      titleRow.appendChild(star);
    }
    titleRow.appendChild(ti);
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
      const colors = (state.settings && state.settings.tag_colors) || {};
      for (const tag of n.tags.slice(0, 3)) {
        const sp = document.createElement('span'); sp.className = 'nl-tag'; sp.textContent = '#' + tag;
        const c = colors[tag];
        if (c && isSafeCssColor(c)) sp.style.color = c;
        tagWrap.appendChild(sp);
      }
      sub.appendChild(tagWrap);
    }
    li.appendChild(sub);

    li.addEventListener('click', (e) => handleNoteClick(e, n));
    // v0.29 — middle-click opens in a tab (no focus change).
    li.addEventListener('mousedown', (e) => { if (e.button === 1) { e.preventDefault(); addTab(n.id); } });
    els.noteList.appendChild(li);
  }
}

// --- multi-select -------------------------------------------------------
function handleNoteClick(e, n) {
  // v0.29 — Alt+click opens the note in a new tab (Ctrl+click stays for multi-select).
  if (e.altKey) {
    e.preventDefault();
    addTab(n.id);
    openNote(n.id);
    return;
  }
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault();
    if (state.selectedIds.has(n.id)) state.selectedIds.delete(n.id);
    else state.selectedIds.add(n.id);
    state.selectionAnchorId = n.id;
    refreshBulkBar();
    renderList();
    return;
  }
  if (e.shiftKey && state.selectionAnchorId) {
    e.preventDefault();
    const visible = state._visibleNotes || state.notes;
    const a = visible.findIndex(x => x.id === state.selectionAnchorId);
    const b = visible.findIndex(x => x.id === n.id);
    if (a >= 0 && b >= 0) {
      const lo = Math.min(a, b), hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) state.selectedIds.add(visible[i].id);
    }
    refreshBulkBar();
    renderList();
    return;
  }
  // Plain click clears selection and opens the note.
  if (state.selectedIds.size) clearSelection(false);
  state.selectionAnchorId = n.id;
  openNote(n.id);
}

// v0.35 — keyboard navigation through visible notes
function navigateNoteList(delta) {
  const visible = state._visibleNotes && state._visibleNotes.length ? state._visibleNotes : state.notes;
  if (!visible.length) return;
  let idx = visible.findIndex(n => n.id === state.activeId);
  if (idx < 0) idx = -1;
  const next = Math.max(0, Math.min(visible.length - 1, idx + delta));
  if (next !== idx) openNote(visible[next].id);
}
function navigateNoteListAbs(idx) {
  const visible = state._visibleNotes && state._visibleNotes.length ? state._visibleNotes : state.notes;
  if (!visible.length) return;
  const i = Math.max(0, Math.min(visible.length - 1, idx));
  openNote(visible[i].id);
}
async function promptRenameNote() {
  if (!state.activeId || !state.active) return;
  const cur = state.active.title || '';
  const next = prompt('Rename note title:', cur);
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed || trimmed === cur) return;
  try {
    // v0.52 — single command renames the note AND rewrites every [[OldTitle]] reference
    // in other notes (handles |display, #anchor, ^bookmark variants).
    const result = await invoke('rename_note_with_links', { id: state.activeId, newTitle: trimmed });
    const t = result && result.touched_notes ? result.touched_notes : 0;
    const l = result && result.updated_links ? result.updated_links : 0;
    if (t > 0) setStatus(`Renamed; rewrote ${l} link${l === 1 ? '' : 's'} in ${t} note${t === 1 ? '' : 's'}.`);
    else setStatus('Renamed.');
    // Re-load the active note so title input reflects the new value.
    await loadNotes();
    if (state.activeId) await openNote(state.activeId);
  } catch (e) { alert('Rename failed: ' + e); }
}

function clearSelection(rerender) {
  state.selectedIds.clear();
  state.selectionAnchorId = null;
  refreshBulkBar();
  if (rerender !== false) renderList();
}

function refreshBulkBar() {
  const n = state.selectedIds.size;
  if (!els.bulkBar) return;
  if (!n) { els.bulkBar.classList.add('hidden'); return; }
  els.bulkBar.classList.remove('hidden');
  els.bulkCount.textContent = n + ' ' + (n === 1 ? t('bulk.selected_singular', 'selected') : t('bulk.selected_plural', 'selected'));
}

async function bulkPin(pin) {
  const ids = Array.from(state.selectedIds);
  if (!ids.length) return;
  try {
    await invoke('bulk_set_pinned', { ids, pinned: pin });
    clearSelection(false);
    await loadNotes();
  } catch (e) { alert('Bulk pin failed: ' + e); }
}
async function bulkTrashSelected() {
  const ids = Array.from(state.selectedIds);
  if (!ids.length) return;
  if (!confirm('Move ' + ids.length + ' note(s) to trash?')) return;
  try {
    await invoke('bulk_trash', { ids });
    if (ids.includes(state.activeId)) showEmpty();
    clearSelection(false);
    await loadNotes();
  } catch (e) { alert('Bulk trash failed: ' + e); }
}
async function bulkSetProperty() {
  const ids = Array.from(state.selectedIds);
  if (!ids.length) return;
  const key = prompt('Property key (e.g. "status", "type"):');
  if (!key || !key.trim()) return;
  const value = prompt(`Value to set on all ${ids.length} note(s)\n(leave blank to REMOVE the property):`);
  if (value === null) return;
  const v = value.trim() ? value.trim() : null;
  try {
    const n = await invoke('bulk_set_property', { ids, key: key.trim(), value: v });
    setStatus((v == null ? 'Removed ' : 'Set ') + key + (v == null ? '' : ' = ' + v) + ' on ' + n + ' note' + (n === 1 ? '' : 's') + '.');
    clearSelection(false);
    await loadNotes();
    if (state.activeId) await openNote(state.activeId);
  } catch (e) { alert('Bulk property failed: ' + e); }
}

async function bulkMergeSelected() {
  const ids = Array.from(state.selectedIds);
  if (ids.length < 2) { alert('Select at least 2 notes (Ctrl/Cmd-click) to merge.'); return; }
  const target = ids[0];
  const sources = ids.slice(1);
  const targetName = (state.notes.find(n => n.id === target) || {}).title || 'first selected';
  if (!confirm(`Merge ${sources.length} note(s) into "${targetName}"?\n\nSource notes will be moved to trash and their bodies appended (each under "## Title").`)) return;
  try {
    const merged = await invoke('merge_notes', { targetId: target, sourceIds: sources });
    clearSelection(false);
    await loadNotes();
    openNote(merged.id);
  } catch (e) { alert('Merge failed: ' + e); }
}

async function bulkExportSelected() {
  const ids = Array.from(state.selectedIds);
  if (!ids.length) return;
  try {
    const out = await invoke('bulk_export_md', { ids });
    downloadJson('mycelium-export-selected.json', { format: 'mycelium-export-v1', exported_at: new Date().toISOString(), notes: out.map(([f, c]) => ({ filename: f, content: c })) });
  } catch (e) { alert('Bulk export failed: ' + e); }
}

// --- drag-reorder pinned ----------------------------------------------
async function reorderPinnedDrop(draggedId, targetId) {
  // v0.43 — always operate on the FULL pinned set (not the filtered visible list)
  // so notes hidden by a tag/search filter still get a contiguous display_order.
  const fullPinned = allNotesView()
    .filter(n => n.pinned && !n.trashed_at)
    .slice()
    .sort((a, b) => {
      const ao = a.display_order && a.display_order > 0 ? a.display_order : Number.MAX_SAFE_INTEGER;
      const bo = b.display_order && b.display_order > 0 ? b.display_order : Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });
  const ids = fullPinned.map(n => n.id).filter(id => id !== draggedId);
  const tIdx = ids.indexOf(targetId);
  if (tIdx < 0) return;
  ids.splice(tIdx, 0, draggedId);
  try {
    await invoke('reorder_pinned', { ids });
    await loadNotes();
  } catch (e) { setStatus('reorder failed: ' + e); }
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
    all.addEventListener('click', () => { state.activeTag = null; renderList(); renderTagBar(); refreshFilterPill(); });
    els.tagBar.appendChild(all);
    const colors = (state.settings && state.settings.tag_colors) || {};
    for (const [tag, count] of tags) {
      const b = document.createElement('button');
      b.className = 'tag-chip' + (state.activeTag === tag ? ' on' : '');
      b.textContent = '#' + tag + ' ' + count;
      // v0.64 — apply per-tag color if user has set one
      const c = colors[tag];
      if (c && isSafeCssColor(c)) {
        b.style.borderColor = c;
        b.style.color = c;
      }
      b.addEventListener('click', () => { state.activeTag = state.activeTag === tag ? null : tag; renderList(); renderTagBar(); refreshFilterPill(); });
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showTagContextMenu(e.clientX, e.clientY, tag);
      });
      els.tagBar.appendChild(b);
    }
  } catch (e) { console.error(e); }
}

async function openNote(id) {
  if (state.pendingTimer) { clearTimeout(state.pendingTimer); await flushSave(); }
  const note = await invoke('get_note', { id });
  if (!note) { setStatus('note vanished'); await loadNotes(); showEmpty(); return; }
  state.activeId = id; state.active = note;
  state.collapsedLines = new Set(); // v0.11 — folds reset per note
  closeWikiAutocomplete();
  closeTagAutocomplete(); // v0.54
  hideWikiHover();         // v0.62
  pushRecent(id); // v0.12 — recents
  addTab(id);     // v0.29 — register / focus tab
  pushNav(id);    // v0.57 — back/forward history
  // v0.66 — if the body is an encrypted envelope and we have a cached passphrase,
  // auto-decrypt before display. Otherwise leave the envelope visible (user can run
  // "Unlock this note" to decrypt).
  if (isNoteEncrypted(note.body || '')) {
    const passphrase = state.notePassphrases.get(id);
    if (passphrase) {
      try {
        const plaintext = await invoke('decrypt_note_body', { envelope: note.body, passphrase });
        note.body = plaintext;
      } catch (_) { /* fall through; show envelope */ }
    }
  }
  showView('editor');
  els.title.value = note.title || '';
  els.body.value = note.body || '';
  els.meta.textContent = (note.pinned ? 'Pinned · ' : '') + 'Updated ' + fmtDate(note.updated_at);
  els.pinBtn.classList.toggle('on', !!note.pinned);
  els.pinBtn.title = note.pinned ? 'Unpin' : 'Pin to top';
  setSaveState('saved');
  // v0.51 — draft restore prompt: if a local draft is newer than the file's body, offer to restore it.
  const draft = getDraft(id);
  if (draft && typeof draft.body === 'string' && draft.body !== (note.body || '')) {
    const ageMin = Math.round((Date.now() - draft.ts) / 60000);
    const ok = confirm(
      `A local unsaved draft of this note exists (last edited ${ageMin} min ago).\n\n` +
      `OK = restore the draft (you can save again to persist it)\n` +
      `Cancel = discard the draft and keep the saved version`
    );
    if (ok) {
      els.body.value = draft.body;
      scheduleSave();
    } else {
      clearDraft(id);
    }
  }
  if (state.settings.default_preview) { state.preview = true; updatePreviewUI(); }
  else { state.preview = false; updatePreviewUI(); }
  refreshStats();
  refreshBacklinks();
  refreshOutline();
  refreshProps();
  applyColorBand(); // v0.47 — editor top border in note.color, if any
  renderList();
  renderTabs(); // v0.29
  restoreScroll(id); // v0.32
  emitToPlugins('note:opened', cloneNote(note));
}

// v0.47 — apply a colored band at the top of the editor pane based on note's
// frontmatter `color:` (sidebar already shows the same color).
function applyColorBand() {
  if (!els.editor) return;
  els.editor.style.borderTop = '';
  if (!state.activeId) return;
  const note = (state.notes || []).find(n => n.id === state.activeId);
  if (note && note.color && isSafeCssColor(note.color)) {
    els.editor.style.borderTop = '3px solid ' + note.color;
  }
}

function showView(name) {
  const showEditor = name === 'editor';
  const showTrash = name === 'trash';
  const showEmpty = name === 'empty';
  const showTasks = name === 'tasks';
  els.editor.classList.toggle('hidden', !showEditor);
  els.trashPane.classList.toggle('hidden', !showTrash);
  els.emptyState.classList.toggle('hidden', !showEmpty);
  if (els.tasksPane) els.tasksPane.classList.toggle('hidden', !showTasks);
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
  const title = els.title.value;
  let body = els.body.value;
  // v0.13 — optional trailing whitespace strip on save.
  if (state.settings.strip_trailing_ws) {
    const stripped = stripTrailingWhitespace(body);
    if (stripped !== body) {
      const ss = els.body.selectionStart, se = els.body.selectionEnd;
      els.body.value = stripped;
      els.body.setSelectionRange(Math.min(ss, stripped.length), Math.min(se, stripped.length));
      body = stripped;
    }
  }
  // v0.66 — if this note has a cached per-note passphrase, re-encrypt the body before
  // persisting so the file on disk stays as a `_note_enc1` envelope. Skip if the body
  // is *already* an envelope (means the user never unlocked, just clicked away).
  const passphrase = state.notePassphrases.get(id);
  if (passphrase && !isNoteEncrypted(body)) {
    try { body = await invoke('encrypt_note_body', { plaintext: body, passphrase }); }
    catch (e) { setSaveState('save failed'); setStatus('encrypt failed: ' + e); return; }
  }
  setSaveState('saving...');
  try {
    const note = await invoke('update_note', { id, title, body });
    state.active = note;
    els.meta.textContent = (note.pinned ? 'Pinned · ' : '') + 'Updated ' + fmtDate(note.updated_at);
    setSaveState('saved');
    clearDraft(id); // v0.51 — drop the local draft once we've persisted to disk
    refreshStats();
    refreshOutline();
    refreshProps();
    if (state.preview) renderPreview();
    await loadNotes();
    applyColorBand(); // v0.47 — color band may have changed via frontmatter edit
    maybeSnapshot();
    emitToPlugins('note:saved', cloneNote(note));
  } catch (e) { setSaveState('save failed'); setStatus('save failed: ' + e); }
}

function scheduleSave() {
  setSaveState('editing...');
  // v0.51 — write a per-note draft to localStorage on every keystroke for crash recovery.
  if (state.activeId && els.body) rememberDraft(state.activeId, els.body.value);
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
  let { html } = window.Markdown.render(src);
  if (state.settings.smart_typography) {
    try { html = smartTypography(html); } catch (_) { /* fall back to raw html */ }
  }
  if (state.settings.auto_wiki_link) {
    try { html = autoLinkTitles(html); } catch (_) { /* keep raw html */ }
  }
  els.preview.innerHTML = html;
  els.preview.querySelectorAll('a.wiki-link').forEach(a => {
    const title = a.dataset.wiki;
    const anchor = a.dataset.anchor || '';
    // v0.62 — hover preview tooltip with the first ~200 chars of the target note's body.
    let hoverTimer = null;
    a.addEventListener('mouseenter', () => {
      hoverTimer = setTimeout(async () => {
        const target = state.notes.find(n => (n.title || '').toLowerCase() === title.toLowerCase())
                    || (state._allNotesCache || []).find(n => (n.title || '').toLowerCase() === title.toLowerCase());
        if (!target) return;
        try {
          const note = await invoke('get_note', { id: target.id });
          if (!note) return;
          showWikiHover(a, note);
        } catch (_) {}
      }, 350);
    });
    a.addEventListener('mouseleave', () => {
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
      hideWikiHover();
    });
    // v0.15 + v0.20 — first try sync match by title; for misses, the click handler
    // calls resolve_link which also checks frontmatter aliases.
    const found = state.notes.find(n => (n.title || '').toLowerCase() === title.toLowerCase());
    if (!found && !anchor) {
      // We'll mark dead provisionally; resolve_link is async and may still find an alias on click.
      a.classList.add('dead');
      a.title = 'No note titled "' + title + '" — click to resolve via alias or create.';
    }
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      let resolved;
      try { resolved = await invoke('resolve_link', { target: title + (anchor ? '#' + anchor : '') }); }
      catch (_) { resolved = null; }
      if (resolved && resolved.id) {
        // v0.65 — Ctrl/Cmd+click opens in a new tab and focuses; plain click navigates in place.
        if (e.ctrlKey || e.metaKey) { addTab(resolved.id); }
        await openNote(resolved.id);
        if (resolved.anchor) scrollPreviewToHeading(resolved.anchor);
        return;
      }
      if (confirm(`No note resolves to "${title}". Create one?`)) {
        const note = await invoke('create_note', { title, body: '' });
        await loadNotes(); openNote(note.id);
      }
    });
    // v0.65 — middle-click opens in a background tab (no focus change), like browsers.
    a.addEventListener('mousedown', async (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      let resolved;
      try { resolved = await invoke('resolve_link', { target: title + (anchor ? '#' + anchor : '') }); }
      catch (_) { resolved = null; }
      if (resolved && resolved.id) addTab(resolved.id);
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
  // v0.12 — TOC link clicks jump to source line and scroll preview heading into view.
  els.preview.querySelectorAll('a.toc-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const line = parseInt(a.dataset.tocLine, 10);
      if (Number.isNaN(line)) return;
      jumpToLine(line + 1);
      const heads = els.preview.querySelectorAll('.fold-h');
      for (const h of heads) {
        if (parseInt(h.dataset.line, 10) === line) { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
      }
    });
  });
  // v0.18 — inline queries: hydrate each `<div class="md-query">` with results.
  els.preview.querySelectorAll('div.md-query').forEach(async (box) => {
    const expr = box.getAttribute('data-query') || '';
    const ul = box.querySelector('ul.md-query-results');
    if (!ul) return;
    try {
      const results = await invoke('query_notes', { query: expr });
      ul.innerHTML = '';
      if (!results.length) {
        const li = document.createElement('li');
        li.className = 'md-query-empty'; li.textContent = 'No matches.';
        ul.appendChild(li);
        return;
      }
      for (const r of results) {
        const li = document.createElement('li');
        const a = document.createElement('a'); a.href = '#';
        a.textContent = r.title || 'Untitled';
        a.addEventListener('click', (e) => { e.preventDefault(); openNote(r.id); });
        li.appendChild(a);
        const t = document.createElement('span'); t.className = 'md-query-time';
        t.textContent = fmtDate(r.updated_at);
        li.appendChild(t);
        ul.appendChild(li);
      }
    } catch (e) {
      ul.innerHTML = '<li class="md-query-error">' + escapeHtml(String(e)) + '</li>';
    }
  });
  // v0.11 — copy buttons on code blocks.
  els.preview.querySelectorAll('button.code-copy').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const b64 = btn.getAttribute('data-code-b64') || '';
      let code = '';
      try { code = decodeURIComponent(escape(atob(b64))); } catch (_) { code = ''; }
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = '⧉'; }, 1200);
      } catch (err) {
        // Fallback: select inside <pre> for manual copy.
        const pre = btn.parentElement.querySelector('pre');
        if (pre) {
          const range = document.createRange();
          range.selectNodeContents(pre);
          const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        }
      }
    });
  });
  // v0.11 — foldable headings.
  applyFoldedState();
  els.preview.querySelectorAll('h1.fold-h, h2.fold-h, h3.fold-h, h4.fold-h, h5.fold-h, h6.fold-h').forEach(h => {
    const btn = h.querySelector('button.fold-toggle');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const line = parseInt(h.dataset.line, 10);
      if (Number.isNaN(line)) return;
      if (!state.collapsedLines) state.collapsedLines = new Set();
      if (state.collapsedLines.has(line)) state.collapsedLines.delete(line);
      else state.collapsedLines.add(line);
      applyFoldedState();
    });
  });
}

function applyFoldedState() {
  if (!els.preview) return;
  if (!state.collapsedLines) state.collapsedLines = new Set();
  const headings = Array.from(els.preview.querySelectorAll('h1.fold-h, h2.fold-h, h3.fold-h, h4.fold-h, h5.fold-h, h6.fold-h'));
  // Reset
  els.preview.querySelectorAll('.is-folded-out').forEach(el => el.classList.remove('is-folded-out'));
  headings.forEach(h => h.classList.remove('is-collapsed'));
  for (const h of headings) {
    const line = parseInt(h.dataset.line, 10);
    if (!state.collapsedLines.has(line)) continue;
    h.classList.add('is-collapsed');
    const level = parseInt(h.dataset.level, 10) || 1;
    // Hide every following sibling until a heading of <= level appears.
    let sib = h.nextElementSibling;
    while (sib) {
      if (sib.classList && sib.classList.contains('fold-h')) {
        const slvl = parseInt(sib.dataset.level, 10) || 1;
        if (slvl <= level) break;
      }
      sib.classList.add('is-folded-out');
      sib = sib.nextElementSibling;
    }
  }
}

async function refreshStats() {
  if (!state.activeId) return;
  try {
    const s = await invoke('note_stats', { id: state.activeId });
    els.statWords.textContent = s.words + (s.words === 1 ? ' word' : ' words');
    els.statChars.textContent = s.chars + ' chars';
    els.statRead.textContent = '~' + s.read_minutes + ' min read';
    // v0.32 — show writing-goal progress if frontmatter `goal:` set on the active note.
    if (els.statGoal) updateGoalChip(s);
  } catch (e) { /* silent */ }
}

// v0.32 — derive goal from frontmatter and render a colored chip.
function updateGoalChip(stats) {
  els.statGoal.classList.add('hidden');
  els.statGoal.textContent = '';
  els.statGoal.classList.remove('goal-met');
  const body = els.body && els.body.value ? els.body.value : '';
  // Pull frontmatter `goal:` line (we only need the raw text — backend's parse is also fine but cheaper here).
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return;
  const goalLine = m[1].split(/\r?\n/).find(l => /^\s*goal\s*:/i.test(l));
  if (!goalLine) return;
  const v = goalLine.split(':').slice(1).join(':').trim();
  if (!v) return;
  let unit = 'words';
  let target = parseInt(v, 10);
  if (Number.isNaN(target) || target <= 0) return;
  if (/chars?/i.test(v)) unit = 'chars';
  if (/min(utes?)?/i.test(v)) unit = 'min';
  let current = stats.words;
  if (unit === 'chars') current = stats.chars;
  if (unit === 'min') current = stats.read_minutes;
  const pct = Math.min(100, Math.round((current / target) * 100));
  const met = current >= target;
  els.statGoal.classList.remove('hidden');
  // v0.44 — render a small inline progress bar alongside the text.
  els.statGoal.innerHTML = `<span class="goal-bar"><span class="goal-bar-fill" style="width:${pct}%"></span></span>` +
    `<span class="goal-text">${current} / ${target} ${escapeHtml(unit)} (${pct}%)</span>`;
  if (met) els.statGoal.classList.add('goal-met');
}

// v0.32 — per-note scroll position memory in localStorage
const SCROLL_KEY = 'mycelium.scroll.v1';
function loadScrollMap() {
  try { return JSON.parse(localStorage.getItem(SCROLL_KEY) || '{}') || {}; }
  catch (_) { return {}; }
}
function saveScrollMap(map) {
  try { localStorage.setItem(SCROLL_KEY, JSON.stringify(map)); } catch (_) {}
}
function rememberScroll(id, pos) {
  if (!id) return;
  const map = loadScrollMap();
  map[id] = pos;
  saveScrollMap(map);
}
function restoreScroll(id) {
  if (!id || !els.body) return;
  const pos = loadScrollMap()[id];
  if (typeof pos === 'number') {
    requestAnimationFrame(() => { els.body.scrollTop = pos; });
  }
}

// v0.16 — refresh the properties strip below the title.
async function refreshProps() {
  if (!els.propsStrip) return;
  if (!state.activeId) { els.propsStrip.classList.add('hidden'); return; }
  try {
    const props = await invoke('note_properties', { id: state.activeId });
    const entries = Object.entries(props);
    if (!entries.length) { els.propsStrip.classList.add('hidden'); els.propsStrip.innerHTML = ''; return; }
    els.propsStrip.innerHTML = '';
    els.propsStrip.classList.remove('hidden');
    for (const [k, v] of entries) {
      const chip = document.createElement('span');
      chip.className = 'prop-chip';
      chip.title = 'Click to filter all notes with ' + k + ' = ' + v;
      const ks = document.createElement('strong'); ks.textContent = k;
      const sep = document.createTextNode(': ');
      const vs = document.createElement('span'); vs.textContent = v;
      chip.appendChild(ks); chip.appendChild(sep); chip.appendChild(vs);
      chip.addEventListener('click', () => filterByProperty(k, v));
      els.propsStrip.appendChild(chip);
    }
  } catch (e) { /* silent */ }
}

async function filterByProperty(key, value) {
  try {
    state.notes = await invoke('notes_by_property', { key, value: value || null });
    state.view = 'props';
    state.activeTag = null;
    document.querySelectorAll('.side-nav-btn').forEach(b => b.classList.remove('active'));
    if (state.activeId) showView('editor'); else showView('empty');
    renderList(); renderTagBar();
    setStatus('Filtered by ' + key + (value ? ' = ' + value : ''));
  } catch (e) { setStatus('filter failed: ' + e); }
}

async function promptFilterByProperty() {
  let keys = [];
  try { keys = await invoke('all_property_keys'); } catch (_) { keys = []; }
  if (!keys.length) { alert('No notes have frontmatter properties yet. Add a `--- key: value ---` block at the top of any note.'); return; }
  const opts = keys.map(([k, n]) => `${k} (${n} note${n === 1 ? '' : 's'})`).join('\n');
  const k = prompt(`Filter by property — pick a key:\n\n${opts}\n\nEnter the key:`);
  if (!k) return;
  const v = prompt(`Value to match (leave blank for "any value"):`);
  await filterByProperty(k.trim(), v && v.trim() ? v.trim() : null);
}

async function refreshBacklinks() {
  if (!state.settings.show_backlinks) { els.backlinksPanel.classList.add('hidden'); return; }
  if (!state.active) { els.backlinksPanel.classList.add('hidden'); return; }
  let backlinks = [];
  let outgoing = [];
  let suggested = [];
  let mentionsList = [];
  try {
    if (state.active.title) backlinks = await invoke('backlinks_with_context', { title: state.active.title });
    outgoing = await invoke('outgoing_links', { id: state.activeId });
    suggested = await invoke('suggested_notes', { id: state.activeId, limit: 6 });
    if (state.active.title) mentionsList = await invoke('mentions', { title: state.active.title });
  } catch (e) { console.error(e); }
  if (!backlinks.length && !outgoing.length && !suggested.length && !mentionsList.length) { els.backlinksPanel.classList.add('hidden'); return; }
  els.backlinksPanel.classList.remove('hidden');
  els.backlinksList.innerHTML = '';
  for (const b of backlinks) {
    const li = document.createElement('li');
    li.classList.add('bl-with-snippet');
    const top = document.createElement('div'); top.className = 'bl-row';
    const a = document.createElement('a'); a.href = '#';
    a.textContent = b.title || 'Untitled';
    a.addEventListener('click', (e) => { e.preventDefault(); openNote(b.id); });
    top.appendChild(a);
    const t = document.createElement('span'); t.className = 'bl-time'; t.textContent = fmtDate(b.updated_at);
    top.appendChild(t);
    li.appendChild(top);
    if (b.snippet) {
      const s = document.createElement('div'); s.className = 'bl-snippet'; s.textContent = b.snippet;
      li.appendChild(s);
    }
    els.backlinksList.appendChild(li);
  }
  // v0.23 — mentions
  if (els.mentionsList) {
    els.mentionsList.innerHTML = '';
    for (const m of mentionsList) {
      const li = document.createElement('li');
      li.classList.add('bl-with-snippet');
      const top = document.createElement('div'); top.className = 'bl-row';
      const a = document.createElement('a'); a.href = '#';
      a.textContent = m.title || 'Untitled';
      a.addEventListener('click', (e) => { e.preventDefault(); openNote(m.id); });
      top.appendChild(a);
      const t = document.createElement('span'); t.className = 'bl-time'; t.textContent = fmtDate(m.updated_at);
      top.appendChild(t);
      li.appendChild(top);
      if (m.snippet) {
        const s = document.createElement('div'); s.className = 'bl-snippet'; s.textContent = m.snippet;
        li.appendChild(s);
      }
      els.mentionsList.appendChild(li);
    }
  }
  const headMen = document.querySelector('.bl-h-mentions');
  if (headMen) headMen.style.display = mentionsList.length ? '' : 'none';
  els.outgoingList.innerHTML = '';
  for (const o of outgoing) {
    const li = document.createElement('li');
    const a = document.createElement('a'); a.href = '#';
    a.textContent = o.title;
    if (!o.exists) { li.classList.add('dead'); a.title = 'No note with this title — click to create.'; }
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      if (o.exists && o.id) { openNote(o.id); return; }
      const note = await invoke('create_note', { title: o.title, body: '' });
      await loadNotes(); openNote(note.id);
    });
    li.appendChild(a);
    if (!o.exists) {
      const tag = document.createElement('span'); tag.className = 'bl-time bl-dead'; tag.textContent = 'missing';
      li.appendChild(tag);
    }
    els.outgoingList.appendChild(li);
  }
  // Hide outgoing heading if list empty.
  const headOut = document.querySelector('.bl-h-out');
  if (headOut) headOut.style.display = outgoing.length ? '' : 'none';
  // v0.21 — suggested
  if (els.suggestedList) {
    els.suggestedList.innerHTML = '';
    for (const s of suggested) {
      const li = document.createElement('li');
      const a = document.createElement('a'); a.href = '#';
      a.textContent = s.title || 'Untitled';
      a.addEventListener('click', (e) => { e.preventDefault(); openNote(s.id); });
      li.appendChild(a);
      const t = document.createElement('span'); t.className = 'bl-time'; t.textContent = fmtDate(s.updated_at);
      li.appendChild(t);
      els.suggestedList.appendChild(li);
    }
  }
  const headSug = document.querySelector('.bl-h-suggest');
  if (headSug) headSug.style.display = suggested.length ? '' : 'none';
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
  clearSelection(false);
  document.querySelectorAll('.side-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'trash'));
  showView('trash');
  try {
    const trash = await invoke('list_trash');
    renderTrashList(trash);
  } catch (e) { setStatus('trash load failed: ' + e); }
}

async function openAllNotes() {
  state.view = 'all';
  clearSelection(false);
  document.querySelectorAll('.side-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'all'));
  if (state.activeId) showView('editor'); else showView('empty');
  await loadNotes();
}

// v0.50 — Tasks (global TODO list) view
async function openTasks() {
  state.view = 'tasks';
  clearSelection(false);
  document.querySelectorAll('.side-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'tasks'));
  showView('tasks');
  await refreshTasksView();
}
async function refreshTasksView() {
  const includeDone = !!(els.tasksIncludeDone && els.tasksIncludeDone.checked);
  let tasks = [];
  try { tasks = await invoke('all_tasks', { includeDone }); }
  catch (e) { setStatus('tasks load failed: ' + e); return; }
  if (!els.tasksList) return;
  els.tasksList.innerHTML = '';
  if (!tasks.length) {
    const li = document.createElement('li');
    li.className = 'empty-row';
    li.textContent = includeDone ? 'No tasks anywhere — nice.' : 'No open tasks. Toggle "show completed" to see done items.';
    els.tasksList.appendChild(li);
    refreshTasksBadge(0);
    return;
  }
  // Group by note for readability.
  const byNote = new Map();
  for (const t of tasks) {
    if (!byNote.has(t.note_id)) byNote.set(t.note_id, { title: t.note_title, items: [] });
    byNote.get(t.note_id).items.push(t);
  }
  for (const [noteId, group] of byNote) {
    const head = document.createElement('li');
    head.className = 'task-group-head';
    const a = document.createElement('a'); a.href = '#'; a.textContent = group.title;
    a.addEventListener('click', (e) => { e.preventDefault(); openNote(noteId); });
    head.appendChild(a);
    const count = document.createElement('span'); count.className = 'task-group-count';
    count.textContent = group.items.length + (group.items.length === 1 ? ' task' : ' tasks');
    head.appendChild(count);
    els.tasksList.appendChild(head);
    for (const t of group.items) {
      const li = document.createElement('li');
      li.className = 'task-row' + (t.done ? ' done' : '');
      const cb = document.createElement('span'); cb.className = 'task-cb';
      cb.textContent = t.done ? '☑' : '☐';
      const text = document.createElement('span'); text.className = 'task-text'; text.textContent = t.text;
      const where = document.createElement('span'); where.className = 'task-where';
      where.textContent = 'L' + t.line;
      li.appendChild(cb); li.appendChild(text); li.appendChild(where);
      li.addEventListener('click', async () => {
        await openNote(noteId);
        // Jump to the line.
        if (els.body) {
          const lines = els.body.value.split('\n');
          let pos = 0;
          for (let i = 0; i < Math.min(t.line - 1, lines.length); i++) pos += lines[i].length + 1;
          els.body.focus();
          els.body.setSelectionRange(pos, pos);
          els.body.scrollTop = (t.line - 1) * 24;
        }
      });
      els.tasksList.appendChild(li);
    }
  }
  // Badge counts only OPEN tasks.
  const openCount = tasks.filter(t => !t.done).length;
  refreshTasksBadge(openCount);
}
function refreshTasksBadge(n) {
  if (!els.tasksBadge) return;
  if (n > 0) { els.tasksBadge.classList.remove('hidden'); els.tasksBadge.textContent = String(n); }
  else { els.tasksBadge.classList.add('hidden'); els.tasksBadge.textContent = ''; }
}

// v0.15 — Orphans filter view
async function openOrphans() {
  state.view = 'orphans';
  clearSelection(false);
  document.querySelectorAll('.side-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'orphans'));
  if (state.activeId) showView('editor'); else showView('empty');
  try {
    state.notes = await invoke('orphan_notes');
    renderList();
    renderTagBar();
  } catch (e) { setStatus('orphans load failed: ' + e); }
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
  if (name === 'dashboard') refreshDashboard();
  if (name === 'board') refreshBoard();
  if (name === 'calendar') refreshCalendar();
  if (name === 'snippets') snippetsSetup();
  if (name === 'shortcuts') renderShortcutsTable();
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
    if (!state.settings.locale) state.settings.locale = 'en';
    if (state.settings.auto_pair === undefined) state.settings.auto_pair = true;
    if (state.settings.smart_lists === undefined) state.settings.smart_lists = true;
    if (state.settings.strip_trailing_ws === undefined) state.settings.strip_trailing_ws = false;
    if (!state.settings.editor_font_size) state.settings.editor_font_size = 15;
    if (state.settings.word_wrap === undefined) state.settings.word_wrap = true;
    if (state.settings.smart_typography === undefined) state.settings.smart_typography = false;
    els.optAutoUpdate.checked = !!state.settings.auto_check_updates;
    els.optDefaultPreview.checked = !!state.settings.default_preview;
    els.optShowBacklinks.checked = !!state.settings.show_backlinks;
    els.optSpellCheck.checked = !!state.settings.spell_check;
    els.optSort.value = state.settings.sort_by;
    if (els.optLocale) els.optLocale.value = state.settings.locale;
    if (els.optAutoPair) els.optAutoPair.checked = !!state.settings.auto_pair;
    if (els.optSmartLists) els.optSmartLists.checked = !!state.settings.smart_lists;
    if (els.optStripTrailingWs) els.optStripTrailingWs.checked = !!state.settings.strip_trailing_ws;
    if (els.optWordWrap) els.optWordWrap.checked = !!state.settings.word_wrap;
    if (els.optSmartTypography) els.optSmartTypography.checked = !!state.settings.smart_typography;
    if (els.optEditorFontSize) els.optEditorFontSize.value = String(state.settings.editor_font_size);
    applyEditorFontSize();
    applyWordWrap();
    if (!state.settings.board_property) state.settings.board_property = 'status';
    if (!state.settings.calendar_property) state.settings.calendar_property = 'due';
    if (els.boardPropertyInput) els.boardPropertyInput.value = state.settings.board_property;
    if (els.calPropertyInput) els.calPropertyInput.value = state.settings.calendar_property;
    if (state.settings.quick_capture === undefined) state.settings.quick_capture = true;
    if (els.optQuickCapture) els.optQuickCapture.checked = !!state.settings.quick_capture;
    applyQuickCapture();
    if (!state.settings.sidebar_width) state.settings.sidebar_width = 280;
    if (state.settings.sidebar_visible === undefined) state.settings.sidebar_visible = true;
    applySidebarLayout();
    if (state.settings.trash_purge_days === undefined) state.settings.trash_purge_days = 30;
    if (els.optTrashDays) els.optTrashDays.value = String(state.settings.trash_purge_days);
    if (state.settings.auto_wiki_link === undefined) state.settings.auto_wiki_link = false;
    if (els.optAutoWikiLink) els.optAutoWikiLink.checked = !!state.settings.auto_wiki_link;
    if (!state.settings.pomodoro_minutes) state.settings.pomodoro_minutes = 25;
    if (els.optPomodoro) els.optPomodoro.value = String(state.settings.pomodoro_minutes);
    if (state.settings.auto_lock_idle_minutes === undefined) state.settings.auto_lock_idle_minutes = 0;
    if (els.optAutoLockIdle) els.optAutoLockIdle.value = String(state.settings.auto_lock_idle_minutes);
    setupIdleAutoLock();
    if (state.settings.sync_scroll === undefined) state.settings.sync_scroll = true;
    if (els.optSyncScroll) els.optSyncScroll.checked = !!state.settings.sync_scroll;
    if (state.settings.backup_reminder_days === undefined) state.settings.backup_reminder_days = 14;
    if (els.optBackupReminder) els.optBackupReminder.value = String(state.settings.backup_reminder_days);
    refreshLastBackupText();
    refreshNavButtons();
    applySpellCheck();
    renderSavedSearches();
  } catch (e) { console.error(e); }
}

function applySpellCheck() {
  const on = !!state.settings.spell_check;
  els.title.spellcheck = on;
  els.body.spellcheck = on;
}

// --- v0.14 — editor font + word wrap ---------------------------------
function applyEditorFontSize() {
  const sz = Math.max(10, Math.min(28, state.settings.editor_font_size || 15));
  state.settings.editor_font_size = sz;
  els.body.style.fontSize = sz + 'px';
}
function applyWordWrap() {
  const on = !!state.settings.word_wrap;
  els.body.style.whiteSpace = on ? 'pre-wrap' : 'pre';
  els.body.style.overflowX = on ? 'hidden' : 'auto';
  els.body.setAttribute('wrap', on ? 'soft' : 'off');
}
function bumpFontSize(delta) {
  state.settings.editor_font_size = Math.max(10, Math.min(28, (state.settings.editor_font_size || 15) + delta));
  applyEditorFontSize();
  if (els.optEditorFontSize) els.optEditorFontSize.value = String(state.settings.editor_font_size);
  invoke('set_settings', { settings: state.settings }).catch(()=>{});
}
function resetFontSize() {
  state.settings.editor_font_size = 15;
  applyEditorFontSize();
  if (els.optEditorFontSize) els.optEditorFontSize.value = '15';
  invoke('set_settings', { settings: state.settings }).catch(()=>{});
}

// --- v0.37 — auto-wiki-link known titles (preview-only post-pass) ----
function autoLinkTitles(html) {
  const titles = (state.notes || [])
    .map(n => (n.title || '').trim())
    .filter(t => t && t.length >= 3);
  if (!titles.length) return html;
  // Sort longest first to match longer titles before shorter substrings.
  titles.sort((a, b) => b.length - a.length);
  // Build a global regex of word-boundary-bounded title matches.
  const escaped = titles.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('\\b(' + escaped.join('|') + ')\\b', 'g');
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const SKIP = new Set(['A','PRE','CODE','SCRIPT','STYLE','BUTTON']);
  function walk(node) {
    for (const n of Array.from(node.childNodes)) {
      if (n.nodeType === 1) {
        if (SKIP.has(n.tagName)) continue;
        walk(n);
      } else if (n.nodeType === 3) {
        const text = n.nodeValue || '';
        if (!re.test(text)) { re.lastIndex = 0; continue; }
        re.lastIndex = 0;
        const span = document.createElement('span');
        span.innerHTML = text.replace(re, (m) => `<a class="wiki-link auto" href="#" data-wiki="${escapeHtml(m)}">${escapeHtml(m)}</a>`);
        n.replaceWith(...Array.from(span.childNodes));
      }
    }
  }
  walk(tmp);
  return tmp.innerHTML;
}

// --- v0.14 — smart typography (preview-only post-pass) ----------------
function smartTypography(html) {
  // Only operate on text nodes (avoid touching <pre><code> or attributes).
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  walkText(tmp, (txt) => {
    let s = txt;
    // Em-dash, ellipsis.
    s = s.replace(/---/g, '—');
    s = s.replace(/--/g, '—');
    s = s.replace(/\.\.\./g, '…');
    // Curly quotes — naive but reasonable.
    s = s.replace(/(^|[\s(])"/g, '$1“').replace(/"/g, '”');
    s = s.replace(/(^|[\s(])'/g, '$1‘').replace(/'/g, '’');
    return s;
  });
  return tmp.innerHTML;
}
function walkText(root, fn) {
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === 3) { node.nodeValue = fn(node.nodeValue || ''); continue; }
    if (node.nodeType === 1) {
      const tag = node.tagName;
      if (tag === 'PRE' || tag === 'CODE' || tag === 'SCRIPT' || tag === 'STYLE') continue;
      walkText(node, fn);
    }
  }
}

// --- v0.14 — move current line up / down -----------------------------
function moveLine(direction) {
  const ta = els.body;
  const value = ta.value;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = (() => {
    const next = value.indexOf('\n', end);
    return next === -1 ? value.length : next;
  })();
  const cur = value.slice(lineStart, lineEnd);
  if (direction < 0) {
    if (lineStart === 0) return;
    const prevStart = value.lastIndexOf('\n', lineStart - 2) + 1;
    const prev = value.slice(prevStart, lineStart - 1);
    const before = value.slice(0, prevStart);
    const after = value.slice(lineEnd);
    ta.value = before + cur + '\n' + prev + after;
    const delta = lineStart - prevStart;
    ta.setSelectionRange(start - delta, end - delta);
  } else {
    if (lineEnd === value.length) return;
    const nextEndCandidate = value.indexOf('\n', lineEnd + 1);
    const nextEnd = nextEndCandidate === -1 ? value.length : nextEndCandidate;
    const next = value.slice(lineEnd + 1, nextEnd);
    const before = value.slice(0, lineStart);
    const after = value.slice(nextEnd);
    ta.value = before + next + '\n' + cur + after;
    const delta = next.length + 1;
    ta.setSelectionRange(start + delta, end + delta);
  }
  scheduleSave();
}

// --- v0.14 — Print (browser-native print of current preview) ---------
function printActiveNote() {
  if (!state.activeId) return;
  const wasPreview = state.preview;
  if (!wasPreview) { state.preview = true; updatePreviewUI(); }
  document.body.classList.add('print-mode');
  const restore = () => {
    document.body.classList.remove('print-mode');
    if (!wasPreview) { state.preview = false; updatePreviewUI(); }
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  setTimeout(() => window.print(), 80);
}

function sortNotes(notes) {
  const by = state.settings.sort_by || 'updated';
  const arr = notes.slice();
  arr.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
    // v0.43 — respect manual display_order on pinned notes (1-based; 0 = no manual order = last).
    if (a.pinned && b.pinned) {
      const ao = a.display_order && a.display_order > 0 ? a.display_order : Number.MAX_SAFE_INTEGER;
      const bo = b.display_order && b.display_order > 0 ? b.display_order : Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
    }
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
      actions.appendChild(btn('ghost-btn', 'Diff vs current', async () => {
        try {
          const stamp = formatHistoryStamp(it.timestamp);
          const snapBody = await invoke('snapshot_body', { id: state.activeId, timestamp: stamp });
          openDiffModal(it, snapBody, els.body.value || '');
        } catch (e) { alert('Diff failed: ' + e); }
      }));
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
    await markBackupNow(); // v0.56
    alert('Workspace exported. Keep this file safe.');
  } catch (e) { alert('Export failed: ' + e); }
}

// v0.56 — record the time of a successful backup; refresh status text.
async function markBackupNow() {
  state.settings.last_backup_at = new Date().toISOString();
  try { await invoke('set_settings', { settings: state.settings }); } catch (_) {}
  refreshLastBackupText();
}
function refreshLastBackupText() {
  if (!els.lastBackupText) return;
  const ts = state.settings.last_backup_at;
  if (!ts) { els.lastBackupText.textContent = 'Last backup: never'; return; }
  els.lastBackupText.textContent = 'Last backup: ' + fmtDate(ts);
}
function maybeShowBackupReminder() {
  const days = state.settings.backup_reminder_days || 0;
  if (days <= 0) return;
  const last = state.settings.last_backup_at ? new Date(state.settings.last_backup_at).getTime() : 0;
  const ageMs = Date.now() - last;
  const threshold = days * 24 * 3600 * 1000;
  if (ageMs >= threshold) {
    setStatus(`Reminder: it's been ${last ? Math.floor(ageMs / 86400000) + ' days' : 'a while'} since your last workspace backup. Settings → Data → Backup workspace.`);
  }
}

// v0.27 — encrypted backup via passphrase
async function exportWorkspaceEncrypted() {
  const p = prompt('Backup passphrase (at least 6 characters):');
  if (!p) return;
  if (p.length < 6) { alert('Passphrase too short.'); return; }
  const c = prompt('Confirm passphrase:');
  if (p !== c) { alert('Passphrases do not match.'); return; }
  try {
    const bundle = await invoke('export_workspace_encrypted', { passphrase: p });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadJson(`mycelium-workspace-${stamp}.encrypted.json`, bundle);
    await markBackupNow(); // v0.56
    alert('Encrypted workspace exported. Lose the passphrase = lose the data.');
  } catch (e) { alert('Encrypted export failed: ' + e); }
}

async function importWorkspace() {
  const r = await pickFile('.json'); if (!r || !r.json) return;
  let bundle = r.json;
  // v0.27 — auto-detect encrypted format and prompt for passphrase.
  if (bundle.format === 'mycelium-workspace-enc-v1') {
    const p = prompt('This bundle is encrypted. Enter the passphrase:');
    if (!p) return;
    try { bundle = await invoke('decrypt_workspace_bundle', { bundle, passphrase: p }); }
    catch (e) { alert('Decrypt failed: ' + e); return; }
  }
  if (bundle.format !== 'mycelium-workspace-v1') { alert('Not a Mycelium workspace bundle.'); return; }
  const overwrite = confirm('Overwrite notes that already exist with the same ID?\n\nOK = overwrite, Cancel = keep existing copies.');
  try {
    const summary = await invoke('import_workspace', { bundle, overwrite });
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
  if (els.optLocale) state.settings.locale = els.optLocale.value || 'en';
  if (els.optAutoPair) state.settings.auto_pair = !!els.optAutoPair.checked;
  if (els.optSmartLists) state.settings.smart_lists = !!els.optSmartLists.checked;
  if (els.optStripTrailingWs) state.settings.strip_trailing_ws = !!els.optStripTrailingWs.checked;
  if (els.optWordWrap) state.settings.word_wrap = !!els.optWordWrap.checked;
  if (els.optSmartTypography) state.settings.smart_typography = !!els.optSmartTypography.checked;
  if (els.optEditorFontSize) state.settings.editor_font_size = parseInt(els.optEditorFontSize.value, 10) || 15;
  if (els.optQuickCapture) state.settings.quick_capture = !!els.optQuickCapture.checked;
  if (els.optTrashDays) state.settings.trash_purge_days = parseInt(els.optTrashDays.value, 10) || 0;
  if (els.optAutoWikiLink) state.settings.auto_wiki_link = !!els.optAutoWikiLink.checked;
  if (els.optPomodoro) state.settings.pomodoro_minutes = parseInt(els.optPomodoro.value, 10) || 25;
  if (els.optAutoLockIdle) state.settings.auto_lock_idle_minutes = parseInt(els.optAutoLockIdle.value, 10) || 0;
  setupIdleAutoLock();
  if (els.optSyncScroll) state.settings.sync_scroll = !!els.optSyncScroll.checked;
  if (els.optBackupReminder) state.settings.backup_reminder_days = parseInt(els.optBackupReminder.value, 10) || 0;
  applyEditorFontSize();
  applyWordWrap();
  applyQuickCapture();
  if (state.preview) renderPreview();
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
      placeCursorAtMarker();
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
        // v0.31 — if the template body contains {{cursor}}, place caret there.
        placeCursorAtMarker();
      });
      menu.appendChild(li);
    }
  }
  const r = anchor.getBoundingClientRect();
  menu.style.left = r.left + 'px';
  menu.style.top = (r.bottom + 4) + 'px';
  menu.classList.remove('hidden');
}

// v0.31 — find the {{cursor}} marker, remove it, and place the caret at that spot.
function placeCursorAtMarker() {
  if (!els.body) return;
  const v = els.body.value;
  const idx = v.indexOf('{{cursor}}');
  if (idx < 0) return;
  els.body.value = v.slice(0, idx) + v.slice(idx + '{{cursor}}'.length);
  els.body.setSelectionRange(idx, idx);
  els.body.focus();
  scheduleSave();
}

// v0.15 — context menu for tag chips (rename / filter / clear filter)
function showTagContextMenu(x, y, tag) {
  const menu = els.ctxMenu; menu.innerHTML = '';
  const items = [
    { label: 'Filter by #' + tag, run: () => { state.activeTag = tag; renderList(); renderTagBar(); } },
    { label: 'Clear tag filter', run: () => { state.activeTag = null; renderList(); renderTagBar(); } },
    { sep: true },
    // v0.64 — set tag color
    { label: 'Set color for #' + tag + '...', run: async () => {
        const cur = ((state.settings && state.settings.tag_colors) || {})[tag] || '';
        const next = prompt('CSS color for #' + tag + ' (hex like #7aa6ff, named like blue, or blank to clear):', cur);
        if (next === null) return;
        const v = next.trim();
        const colors = { ...(state.settings.tag_colors || {}) };
        if (!v) delete colors[tag];
        else if (isSafeCssColor(v)) colors[tag] = v;
        else { alert('Not a recognised color form.'); return; }
        state.settings.tag_colors = colors;
        try { await invoke('set_settings', { settings: state.settings }); }
        catch (e) { alert('Save failed: ' + e); return; }
        renderTagBar();
        renderList();
    } },
    { sep: true },
    { label: 'Rename tag (#' + tag + ' → ...)...', run: async () => {
        const next = prompt('Rename #' + tag + ' to:', tag);
        if (!next) return;
        const clean = next.trim().replace(/^#/, '').toLowerCase();
        if (!/^[a-z0-9_-]+$/.test(clean)) { alert('Tag name must be alphanumeric / - / _.'); return; }
        if (clean === tag) return;
        if (!confirm(`Rename #${tag} to #${clean} across every non-trashed note? This rewrites note bodies.`)) return;
        try {
          const n = await invoke('rename_tag', { oldTag: tag, newTag: clean });
          setStatus(`Renamed #${tag} → #${clean} in ${n} note${n === 1 ? '' : 's'}.`);
          if (state.activeTag === tag) state.activeTag = clean;
          await loadNotes();
          if (state.activeId) await openNote(state.activeId);
        } catch (e) { alert('Rename failed: ' + e); }
    } },
  ];
  for (const it of items) {
    const li = document.createElement('li');
    if (it.sep) li.className = 'ctx-sep';
    else { li.textContent = it.label; li.addEventListener('click', () => { hideMenus(); it.run(); }); }
    menu.appendChild(li);
  }
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.classList.remove('hidden');
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 6) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
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
    // v0.55 — reveal note's .json file in OS file manager
    { label: 'Reveal note file in OS', run: async () => {
      try { await invoke('reveal_note', { id: note.id }); }
      catch (e) { alert('Reveal failed: ' + e); }
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

// v0.25 — text snippets
state.snippets = [];
async function loadSnippets() {
  try { state.snippets = await invoke('list_snippets'); }
  catch (e) { state.snippets = []; }
}
async function snippetsSetup() {
  await loadSnippets();
  renderSnippetsTable();
}
function renderSnippetsTable() {
  if (!els.snipRows) return;
  els.snipRows.innerHTML = '';
  for (let i = 0; i < state.snippets.length; i++) {
    const s = state.snippets[i];
    const tr = document.createElement('tr');
    const tdKey = document.createElement('td');
    const inKey = document.createElement('input'); inKey.type = 'text'; inKey.className = 'text-input snip-key';
    inKey.value = s.key;
    inKey.addEventListener('input', () => { s.key = inKey.value; });
    tdKey.appendChild(inKey);
    const tdBody = document.createElement('td');
    const taBody = document.createElement('textarea'); taBody.className = 'text-input snip-body'; taBody.rows = 2;
    taBody.value = s.body;
    taBody.addEventListener('input', () => { s.body = taBody.value; });
    tdBody.appendChild(taBody);
    const tdDesc = document.createElement('td');
    const inDesc = document.createElement('input'); inDesc.type = 'text'; inDesc.className = 'text-input snip-desc';
    inDesc.value = s.description || '';
    inDesc.addEventListener('input', () => { s.description = inDesc.value; });
    tdDesc.appendChild(inDesc);
    const tdAct = document.createElement('td');
    const del = document.createElement('button'); del.className = 'danger-btn'; del.textContent = '×';
    del.addEventListener('click', () => { state.snippets.splice(i, 1); renderSnippetsTable(); });
    tdAct.appendChild(del);
    tr.appendChild(tdKey); tr.appendChild(tdBody); tr.appendChild(tdDesc); tr.appendChild(tdAct);
    els.snipRows.appendChild(tr);
  }
}
function addSnippetRow() {
  state.snippets.push({ key: '', body: '', description: '' });
  renderSnippetsTable();
}
async function saveSnippetsFromTable() {
  try {
    await invoke('save_snippets', { snippets: state.snippets });
    setStatus('Saved ' + state.snippets.length + ' snippet' + (state.snippets.length === 1 ? '' : 's') + '.');
  } catch (e) { alert('Save failed: ' + e); }
}
async function resetSnippetsToDefaults() {
  if (!confirm('Reset to default snippets? Your custom snippets will be lost.')) return;
  // Send an empty array — backend default kicks in on next list_snippets call when file is missing.
  // We instead delete the file by saving empty and re-loading.
  try { await invoke('save_snippets', { snippets: [] }); } catch (_) {}
  await loadSnippets();
  // If still empty, reload defaults manually by re-calling list_snippets after a tiny tweak.
  if (!state.snippets.length) {
    state.snippets = await invoke('list_snippets');
  }
  renderSnippetsTable();
}

function tryExpandSnippet() {
  const ta = els.body;
  const caret = ta.selectionStart;
  if (caret !== ta.selectionEnd) return false;
  const upto = ta.value.slice(0, caret);
  const m = upto.match(/;([A-Za-z0-9_-]+)$/);
  if (!m) return false;
  const key = m[1].toLowerCase();
  const snip = (state.snippets || []).find(x => (x.key || '').toLowerCase() === key);
  if (!snip) return false;
  const before = ta.value.slice(0, caret - m[0].length);
  const after = ta.value.slice(caret);
  ta.value = before + snip.body + after;
  const np = before.length + snip.body.length;
  ta.setSelectionRange(np, np);
  scheduleSave();
  return true;
}

// v0.24 — sidebar collapse + drag-to-resize.
function applySidebarLayout() {
  const visible = state.settings.sidebar_visible !== false;
  const w = Math.max(180, Math.min(640, state.settings.sidebar_width || 280));
  state.settings.sidebar_width = w;
  document.documentElement.style.setProperty('--side-w', w + 'px');
  if (els.sidebar) els.sidebar.classList.toggle('hidden', !visible);
  if (els.sidebarDivider) els.sidebarDivider.classList.toggle('hidden', !visible);
  if (els.sidebarToggle) els.sidebarToggle.classList.toggle('hidden', visible);
  document.body.classList.toggle('sidebar-collapsed', !visible);
}
function toggleSidebar() {
  state.settings.sidebar_visible = !(state.settings.sidebar_visible !== false);
  applySidebarLayout();
  invoke('set_settings', { settings: state.settings }).catch(()=>{});
}
function startSidebarResize(e) {
  e.preventDefault();
  const startX = e.clientX;
  const startW = state.settings.sidebar_width || 280;
  document.body.classList.add('resizing-sidebar');
  function onMove(ev) {
    const dx = ev.clientX - startX;
    state.settings.sidebar_width = Math.max(180, Math.min(640, startW + dx));
    document.documentElement.style.setProperty('--side-w', state.settings.sidebar_width + 'px');
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.classList.remove('resizing-sidebar');
    invoke('set_settings', { settings: state.settings }).catch(()=>{});
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// v0.22 — quick-capture: append a timestamped line to today's daily note.
function applyQuickCapture() {
  if (!els.quickCaptureRow) return;
  els.quickCaptureRow.classList.toggle('hidden', !state.settings.quick_capture);
}
async function quickCaptureSubmit() {
  const t = (els.quickCaptureInput.value || '').trim();
  if (!t) return;
  els.quickCaptureInput.disabled = true;
  try {
    await invoke('quick_capture_append', { text: t });
    els.quickCaptureInput.value = '';
    setStatus('Captured to daily note.');
    await loadNotes();
  } catch (e) { alert('Capture failed: ' + e); }
  finally { els.quickCaptureInput.disabled = false; els.quickCaptureInput.focus(); }
}
if (els.quickCaptureInput) {
  els.quickCaptureInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); quickCaptureSubmit(); }
  });
}

// v0.22 — copy current note's Markdown to clipboard
async function copyActiveAsMarkdown() {
  if (!state.activeId) { alert('Open a note first.'); return; }
  try {
    const md = await invoke('export_note_md', { id: state.activeId });
    await navigator.clipboard.writeText(md);
    setStatus('Markdown copied to clipboard.');
  } catch (e) { alert('Copy failed: ' + e); }
}

// v0.26 — copy current note's rendered HTML
async function copyActiveAsHtml() {
  if (!state.activeId) { alert('Open a note first.'); return; }
  const src = els.body.value || '';
  let { html } = window.Markdown.render(src);
  if (state.settings.smart_typography) { try { html = smartTypography(html); } catch(_){} }
  try {
    await navigator.clipboard.writeText(html);
    setStatus('HTML copied to clipboard.');
  } catch (e) { alert('Copy failed: ' + e); }
}

// v0.26 — save current note as a self-contained .html file
function saveActiveAsHtml() {
  if (!state.activeId) { alert('Open a note first.'); return; }
  const src = els.body.value || '';
  let { html } = window.Markdown.render(src);
  if (state.settings.smart_typography) { try { html = smartTypography(html); } catch(_){} }
  const title = state.active && state.active.title ? state.active.title : 'Untitled';
  const safe = title.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim() || 'Untitled';
  const styles = `
    body{max-width:760px;margin:32px auto;padding:0 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#1c1d20;background:#fafafa}
    h1,h2,h3,h4{margin-top:1.6em}
    pre{background:#f0f1f3;padding:12px;border-radius:6px;overflow-x:auto;font-family:ui-monospace,monospace;font-size:13px}
    code{background:#f0f1f3;padding:1px 5px;border-radius:3px;font-family:ui-monospace,monospace;font-size:12.5px}
    a{color:#2a66e0}
    blockquote{border-left:3px solid #d0d2d7;color:#5b5e66;margin:0;padding:4px 12px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #e0e2e7;padding:6px 10px;text-align:left}
    .md-toc{background:#f0f1f3;padding:12px;border-radius:6px;margin:8px 0}
  `;
  const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${styles}</style></head><body><h1>${escapeHtml(title)}</h1>${html}</body></html>`;
  downloadText(safe + '.html', doc, 'text/html;charset=utf-8');
}

// v0.22 — multi-file Markdown import
async function importMultipleMd() {
  els.fileInput.value = '';
  els.fileInput.accept = '.md,.markdown,.txt';
  els.fileInput.multiple = true;
  els.fileInput.onchange = async () => {
    const files = Array.from(els.fileInput.files || []);
    els.fileInput.multiple = false;
    if (!files.length) return;
    let ok = 0, fail = 0;
    for (const f of files) {
      try {
        const text = await f.text();
        await invoke('import_md', { content: text, suggestedTitle: f.name.replace(/\.[^.]+$/, '') });
        ok++;
      } catch (e) { fail++; console.error(e); }
    }
    setStatus(`Imported ${ok} file${ok === 1 ? '' : 's'}.${fail ? ' ' + fail + ' failed.' : ''}`);
    await loadNotes();
  };
  els.fileInput.click();
}

// v0.40 — auto-lock workspace after N minutes of idle.
state.idle = { lastActive: Date.now(), interval: null };
function setupIdleAutoLock() {
  // Always (re)bind activity listeners.
  if (!state.idle._bound) {
    const reset = () => { state.idle.lastActive = Date.now(); };
    document.addEventListener('mousemove', reset);
    document.addEventListener('keydown', reset);
    document.addEventListener('click', reset);
    document.addEventListener('scroll', reset, true);
    state.idle._bound = true;
  }
  if (state.idle.interval) { clearInterval(state.idle.interval); state.idle.interval = null; }
  const min = state.settings.auto_lock_idle_minutes || 0;
  if (min <= 0) return;
  if (!state.lockEnabled) return;
  const ms = min * 60 * 1000;
  state.idle.interval = setInterval(async () => {
    if (state.locked) return;
    if (!state.lockEnabled) return;
    if (Date.now() - state.idle.lastActive < ms) return;
    try {
      await invoke('lock_now');
      state.locked = true;
      if (state.notePassphrases) state.notePassphrases.clear(); // v0.67
      closeSettings();
      showLockScreen();
      setStatus('Auto-locked after idle.');
    } catch (_) { /* ignore */ }
  }, 30000); // check twice a minute
}

// v0.38 — Pomodoro / focus timer
state.pomodoro = { interval: null, endsAt: 0 };
function startPomodoro(minutes) {
  const m = Math.max(1, Math.min(180, minutes || state.settings.pomodoro_minutes || 25));
  if (state.pomodoro.interval) cancelPomodoro(true);
  const ends = Date.now() + m * 60 * 1000;
  state.pomodoro.endsAt = ends;
  setStatus('Focus timer: ' + m + ' min started.');
  state.pomodoro.interval = setInterval(tickPomodoro, 1000);
  tickPomodoro();
}
function tickPomodoro() {
  if (!els.pomodoro) return;
  const left = state.pomodoro.endsAt - Date.now();
  if (left <= 0) {
    finishPomodoro();
    return;
  }
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  els.pomodoro.classList.remove('hidden');
  els.pomodoro.textContent = '⏱ ' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
}
function cancelPomodoro(silent) {
  if (state.pomodoro.interval) clearInterval(state.pomodoro.interval);
  state.pomodoro.interval = null;
  state.pomodoro.endsAt = 0;
  if (els.pomodoro) { els.pomodoro.classList.add('hidden'); els.pomodoro.textContent = ''; }
  if (!silent) setStatus('Focus timer cancelled.');
}
function finishPomodoro() {
  cancelPomodoro(true);
  setStatus('Focus session complete.');
  // Best-effort system bell.
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRl9vAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
    audio.play().catch(() => {});
  } catch (_) {}
  // Browser notification fallback.
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification('Mycelium', { body: 'Focus session complete.' }); } catch (_) {}
  }
}

// v0.66 — Per-note encryption (passphrase per note, kept in memory for the session).
state.notePassphrases = new Map(); // noteId → plaintext passphrase
function isNoteEncrypted(body) {
  if (!body || body.length < 30 || body.length > 2_000_000) return false;
  if (!body.startsWith('{')) return false;
  try {
    const v = JSON.parse(body);
    return v && typeof v === 'object' && typeof v._note_enc1 === 'string' && typeof v.salt === 'string';
  } catch (_) { return false; }
}
async function encryptCurrentNote() {
  if (!state.activeId || !state.active) { alert('Open a note first.'); return; }
  if (isNoteEncrypted(state.active.body || els.body.value || '')) {
    alert('This note is already encrypted.');
    return;
  }
  const p = prompt('Encrypt this note with passphrase (≥6 chars):');
  if (!p) return;
  if (p.length < 6) { alert('Too short.'); return; }
  const c = prompt('Confirm passphrase:');
  if (p !== c) { alert('Passphrases do not match.'); return; }
  try {
    const envelope = await invoke('encrypt_note_body', { plaintext: els.body.value || '', passphrase: p });
    state.notePassphrases.set(state.activeId, p);
    // Save the envelope as the body. The next openNote will see it as encrypted; we'll
    // refresh immediately so the view shows the encrypted state.
    const note = await invoke('update_note', { id: state.activeId, title: null, body: envelope });
    state.active = note;
    setStatus('Note encrypted.');
    await loadNotes();
    await openNote(state.activeId);
  } catch (e) { alert('Encrypt failed: ' + e); }
}
async function unlockCurrentNote() {
  if (!state.activeId || !state.active) return;
  const body = els.body.value || state.active.body || '';
  if (!isNoteEncrypted(body)) { alert('This note is not encrypted.'); return; }
  const p = prompt('Enter the note\'s passphrase:');
  if (!p) return;
  try {
    const plaintext = await invoke('decrypt_note_body', { envelope: body, passphrase: p });
    state.notePassphrases.set(state.activeId, p);
    els.body.value = plaintext;
    state.active.body = plaintext;
    setStatus('Note unlocked.');
    if (state.preview) renderPreview();
    refreshStats();
    refreshProps();
  } catch (e) { alert('Unlock failed: ' + e); }
}
async function decryptCurrentNotePermanently() {
  if (!state.activeId || !state.active) return;
  const body = els.body.value || state.active.body || '';
  // Body is already plaintext if we previously unlocked, in which case `notePassphrases` has the key.
  if (isNoteEncrypted(body)) {
    await unlockCurrentNote();
    if (isNoteEncrypted(els.body.value || '')) return; // unlock failed
  }
  if (!confirm('Permanently decrypt this note? Future saves will store plaintext on disk.')) return;
  state.notePassphrases.delete(state.activeId);
  try {
    await invoke('update_note', { id: state.activeId, title: null, body: els.body.value || '' });
    setStatus('Note permanently decrypted.');
    await loadNotes();
  } catch (e) { alert('Save failed: ' + e); }
}

// v0.62 — wiki-link hover preview.
function ensureWikiHover() {
  let pop = document.getElementById('wiki-hover');
  if (pop) return pop;
  pop = document.createElement('div');
  pop.id = 'wiki-hover';
  pop.className = 'wiki-hover hidden';
  document.body.appendChild(pop);
  return pop;
}
function showWikiHover(anchorEl, note) {
  const pop = ensureWikiHover();
  const title = note.title && note.title.trim() ? note.title : 'Untitled';
  // Strip frontmatter for the excerpt preview.
  const m = (note.body || '').match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const body = m ? note.body.slice(m[0].length) : (note.body || '');
  const excerpt = body.replace(/\s+/g, ' ').slice(0, 240);
  pop.innerHTML = '';
  const h = document.createElement('div'); h.className = 'wh-title'; h.textContent = title;
  const e = document.createElement('div'); e.className = 'wh-excerpt'; e.textContent = excerpt + (body.length > 240 ? '…' : '');
  pop.appendChild(h); pop.appendChild(e);
  pop.classList.remove('hidden');
  // Position near the anchor.
  const r = anchorEl.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  let left = r.left;
  let top = r.bottom + 6;
  if (left + popRect.width > window.innerWidth - 12) left = window.innerWidth - popRect.width - 12;
  if (top + popRect.height > window.innerHeight - 12) top = r.top - popRect.height - 6;
  pop.style.left = Math.max(8, left) + 'px';
  pop.style.top = Math.max(8, top) + 'px';
}
function hideWikiHover() {
  const pop = document.getElementById('wiki-hover');
  if (pop) pop.classList.add('hidden');
}

// v0.20 — scroll preview to a heading whose text matches `anchor` (case-insensitive).
// v0.45 — also recognise `^bookmark` anchors (resolved against `id="bm-<name>"` spans).
function scrollPreviewToHeading(anchor) {
  if (!anchor || !els.preview) return;
  requestAnimationFrame(() => {
    const raw = String(anchor).trim();
    if (raw.startsWith('^')) {
      const name = raw.slice(1).toLowerCase();
      const el = els.preview.querySelector('#bm-' + CSS.escape(name));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const want = raw.toLowerCase();
    const heads = els.preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const h of heads) {
      const txt = (h.textContent || '').replace(/^▾\s*/, '').trim().toLowerCase();
      if (txt === want || txt.startsWith(want)) { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
  });
}

// --- v0.12 — reading mode --------------------------------------------
function toggleReadingMode() {
  if (!state.activeId) return;
  state.reading = !state.reading;
  document.body.classList.toggle('reading-mode', state.reading);
  if (state.reading) {
    // Force preview on while in reading mode.
    if (!state.preview) { state.preview = true; updatePreviewUI(); }
  }
  if (els.readingBtn) els.readingBtn.classList.toggle('on', state.reading);
}

// --- v0.12 — random note ---------------------------------------------
async function openRandomNote() {
  const pool = state.notes.filter(n => !n.trashed_at);
  if (!pool.length) { setStatus('No notes to pick from.'); return; }
  const candidates = pool.length > 1 ? pool.filter(n => n.id !== state.activeId) : pool;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  if (pick) await openNote(pick.id);
}

// --- v0.11 — wiki-link autocomplete -----------------------------------
function ensureWikiPopover() {
  let pop = document.getElementById('wiki-pop');
  if (pop) return pop;
  pop = document.createElement('ul');
  pop.id = 'wiki-pop';
  pop.className = 'wiki-pop hidden';
  document.body.appendChild(pop);
  return pop;
}
function closeWikiAutocomplete() {
  const pop = document.getElementById('wiki-pop');
  if (pop) pop.classList.add('hidden');
  state.wikiAuto = null;
}
async function maybeOpenWikiAutocomplete() {
  if (!state.activeId) return;
  const ta = els.body;
  const caret = ta.selectionStart;
  const upto = ta.value.slice(0, caret);
  const lineStart = upto.lastIndexOf('\n') + 1;
  const lineUpto = upto.slice(lineStart);
  const lastOpen = lineUpto.lastIndexOf('[[');
  if (lastOpen < 0) { closeWikiAutocomplete(); return; }
  const after = lineUpto.slice(lastOpen + 2);
  if (after.includes(']]')) { closeWikiAutocomplete(); return; }
  if (/[\n]/.test(after)) { closeWikiAutocomplete(); return; }
  const query = after.toLowerCase();
  // v0.20 — also suggest aliases.
  // v0.43 — rank by substring position (earlier = better) then by length, and use the
  // unfiltered note set so a sidebar search/tag filter doesn't hide candidates.
  const seen = new Set();
  const scored = [];
  for (const n of allNotesView()) {
    if (!n.title) continue;
    const lc = n.title.toLowerCase();
    if (query && !lc.includes(query)) continue;
    const idx = query ? lc.indexOf(query) : 0;
    const k = 'title:' + n.title;
    if (seen.has(k)) continue;
    seen.add(k);
    scored.push({ title: n.title, hint: '', score: idx * 1000 + n.title.length });
  }
  scored.sort((a, b) => a.score - b.score);
  const matches = scored.slice(0, 8);
  if (matches.length < 8) {
    let aliasInfo = [];
    try { aliasInfo = await invoke('all_aliases'); } catch (_) { aliasInfo = []; }
    const aliasScored = [];
    for (const ai of aliasInfo) {
      for (const al of (ai.aliases || [])) {
        const lc = (al || '').toLowerCase();
        if (query && !lc.includes(query)) continue;
        const k = 'alias:' + al;
        if (seen.has(k)) continue;
        seen.add(k);
        const idx = query ? lc.indexOf(query) : 0;
        aliasScored.push({ title: al, hint: '→ ' + ai.title, score: idx * 1000 + al.length });
      }
    }
    aliasScored.sort((a, b) => a.score - b.score);
    for (const m of aliasScored) {
      matches.push(m);
      if (matches.length >= 8) break;
    }
  }
  if (!matches.length) { closeWikiAutocomplete(); return; }
  const pop = ensureWikiPopover();
  pop.innerHTML = '';
  state.wikiAuto = { from: lineStart + lastOpen, to: caret, items: matches, cursor: 0 };
  matches.forEach((n, idx) => {
    const li = document.createElement('li');
    li.className = 'wiki-pop-item' + (idx === 0 ? ' on' : '');
    const lab = document.createElement('span'); lab.textContent = n.title || 'Untitled';
    li.appendChild(lab);
    if (n.hint) { const h = document.createElement('span'); h.className = 'wiki-pop-hint'; h.textContent = ' ' + n.hint; li.appendChild(h); }
    li.addEventListener('mousedown', (e) => { e.preventDefault(); commitWikiAutocomplete(idx); });
    pop.appendChild(li);
  });
  // Position near the caret. We use textarea's bounding rect + a rough estimate.
  const r = ta.getBoundingClientRect();
  const before = ta.value.slice(0, caret);
  const linesBefore = before.split('\n').length - 1;
  const lineHeight = 24;
  const top = Math.min(r.top + (linesBefore + 1) * lineHeight - ta.scrollTop + 4, window.innerHeight - 220);
  const left = Math.min(r.left + 80, window.innerWidth - 260);
  pop.style.left = left + 'px';
  pop.style.top = Math.max(r.top + 8, top) + 'px';
  pop.classList.remove('hidden');
}
function commitWikiAutocomplete(index) {
  if (!state.wikiAuto) return;
  const item = state.wikiAuto.items[index];
  if (!item) return;
  const ta = els.body;
  const before = ta.value.slice(0, state.wikiAuto.from);
  const after = ta.value.slice(state.wikiAuto.to);
  const insert = '[[' + (item.title || '') + ']]';
  ta.value = before + insert + after;
  const newCaret = before.length + insert.length;
  ta.setSelectionRange(newCaret, newCaret);
  closeWikiAutocomplete();
  scheduleSave();
}
function moveWikiCursor(delta) {
  if (!state.wikiAuto) return;
  const pop = document.getElementById('wiki-pop');
  if (!pop) return;
  state.wikiAuto.cursor = Math.max(0, Math.min(state.wikiAuto.items.length - 1, state.wikiAuto.cursor + delta));
  Array.from(pop.children).forEach((li, i) => li.classList.toggle('on', i === state.wikiAuto.cursor));
}

// --- v0.13 — smart editor (list continuation, indent, paste URL) ------
function handleSmartEnter(e) {
  if (!state.settings.smart_lists) return false;
  if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return false;
  const ta = els.body;
  const pos = ta.selectionStart;
  if (pos !== ta.selectionEnd) return false;
  const value = ta.value;
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
  const line = value.slice(lineStart, pos);
  // Bullet list: "- ", "* ", "+ "
  let m = line.match(/^(\s*)([-*+])\s+(\[[ xX]\]\s+)?(.*)$/);
  if (m) {
    const indent = m[1], marker = m[2], task = m[3] || '', content = m[4];
    // v0.43 — empty content exits the list whether the bullet is plain OR a task ("- [ ] ").
    if (content.trim() === '') {
      e.preventDefault();
      const before = value.slice(0, lineStart);
      const after = value.slice(pos);
      ta.value = before + '\n' + after;
      ta.setSelectionRange(before.length + 1, before.length + 1);
      scheduleSave();
      return true;
    }
    e.preventDefault();
    const insert = '\n' + indent + marker + ' ' + (task ? '[ ] ' : '');
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    ta.value = before + insert + after;
    const np = before.length + insert.length;
    ta.setSelectionRange(np, np);
    scheduleSave();
    return true;
  }
  // Numbered list: "1. "
  m = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if (m) {
    const indent = m[1], n = parseInt(m[2], 10), content = m[3];
    if (content.trim() === '') {
      e.preventDefault();
      const before = value.slice(0, lineStart);
      const after = value.slice(pos);
      ta.value = before + '\n' + after;
      ta.setSelectionRange(before.length + 1, before.length + 1);
      scheduleSave();
      return true;
    }
    e.preventDefault();
    const insert = '\n' + indent + (n + 1) + '. ';
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    ta.value = before + insert + after;
    const np = before.length + insert.length;
    ta.setSelectionRange(np, np);
    scheduleSave();
    return true;
  }
  // v0.67 — Blockquote continuation: "> text" → next line starts with "> ".
  // Empty "> " line exits the quote (replaces with blank line).
  let qm = line.match(/^(\s*)(>+\s*)(.*)$/);
  if (qm) {
    const indent = qm[1], quote = qm[2], content = qm[3];
    if (content.trim() === '') {
      e.preventDefault();
      const before = value.slice(0, lineStart);
      const after = value.slice(pos);
      ta.value = before + '\n' + after;
      ta.setSelectionRange(before.length + 1, before.length + 1);
      scheduleSave();
      return true;
    }
    e.preventDefault();
    // Normalize the quote prefix (e.g. ">" → "> "; ">>" stays ">>").
    const normalized = quote.replace(/\s+$/, '') + ' ';
    const insert = '\n' + indent + normalized;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    ta.value = before + insert + after;
    const np = before.length + insert.length;
    ta.setSelectionRange(np, np);
    scheduleSave();
    return true;
  }
  // Plain auto-indent: continue leading whitespace.
  const lead = line.match(/^(\s+)/);
  if (lead) {
    e.preventDefault();
    const insert = '\n' + lead[1];
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    ta.value = before + insert + after;
    const np = before.length + insert.length;
    ta.setSelectionRange(np, np);
    scheduleSave();
    return true;
  }
  return false;
}

function handleSmartTab(e) {
  if (!state.settings.smart_lists) return false;
  if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return false;
  const ta = els.body;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const value = ta.value;
  // v0.33 — multi-line selection: indent/outdent every line in the range.
  if (start !== end && value.slice(start, end).includes('\n')) {
    e.preventDefault();
    const blockStart = value.lastIndexOf('\n', start - 1) + 1;
    const blockEnd = value.indexOf('\n', end - 1);
    const realEnd = blockEnd === -1 ? value.length : blockEnd;
    const block = value.slice(blockStart, realEnd);
    let newBlock;
    if (e.shiftKey) {
      newBlock = block.split('\n').map(l => l.replace(/^( {1,2}|\t)/, '')).join('\n');
    } else {
      newBlock = block.split('\n').map(l => '  ' + l).join('\n');
    }
    ta.value = value.slice(0, blockStart) + newBlock + value.slice(realEnd);
    const delta = newBlock.length - block.length;
    ta.setSelectionRange(start + (e.shiftKey ? Math.min(0, delta) : 2), end + delta);
    scheduleSave();
    return true;
  }
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const line = value.slice(lineStart, value.indexOf('\n', start) === -1 ? value.length : value.indexOf('\n', start));
  const isList = /^(\s*)([-*+]\s|\d+\.\s)/.test(line);
  if (!isList) {
    // v0.43 — also handle single-line selection on non-list lines: replace selection with 2 spaces
    // (consistent with the no-selection case; prevents Tab from escaping focus to other elements).
    e.preventDefault();
    const before = value.slice(0, start);
    const after = value.slice(end);
    ta.value = before + '  ' + after;
    ta.setSelectionRange(start + 2, start + 2);
    scheduleSave();
    return true;
  }
  if (isList) {
    e.preventDefault();
    const before = value.slice(0, lineStart);
    const after = value.slice(lineStart);
    if (e.shiftKey) {
      const stripped = after.replace(/^( {1,2})/, '');
      ta.value = before + stripped;
      const removed = after.length - stripped.length;
      ta.setSelectionRange(Math.max(lineStart, start - removed), Math.max(lineStart, end - removed));
    } else {
      ta.value = before + '  ' + after;
      ta.setSelectionRange(start + 2, end + 2);
    }
    scheduleSave();
    return true;
  }
  return false;
}

// v0.33 — Delete current line(s) with Ctrl+Shift+K
function deleteCurrentLine() {
  const ta = els.body;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const value = ta.value;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = value.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = value.length;
  else lineEnd += 1; // include the newline
  ta.value = value.slice(0, lineStart) + value.slice(lineEnd);
  const np = Math.min(lineStart, ta.value.length);
  ta.setSelectionRange(np, np);
  scheduleSave();
}

// v0.33 — Duplicate current line(s) with Ctrl+Shift+D
function duplicateCurrentLine() {
  const ta = els.body;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const value = ta.value;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = value.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = value.length;
  const block = value.slice(lineStart, lineEnd);
  ta.value = value.slice(0, lineEnd) + '\n' + block + value.slice(lineEnd);
  ta.setSelectionRange(start + block.length + 1, end + block.length + 1);
  scheduleSave();
}

// v0.33 — Toggle HTML comment around selection (or current line) with Ctrl+/
function toggleComment() {
  const ta = els.body;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const value = ta.value;
  let from, to, sel;
  if (start === end) {
    from = value.lastIndexOf('\n', start - 1) + 1;
    to = value.indexOf('\n', start);
    if (to === -1) to = value.length;
    sel = value.slice(from, to);
  } else {
    from = start; to = end; sel = value.slice(start, end);
  }
  const trimmed = sel.trim();
  let next;
  if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
    next = sel.replace(/^(\s*)<!--\s?/, '$1').replace(/\s?-->(\s*)$/, '$1');
  } else {
    next = '<!-- ' + sel + ' -->';
  }
  ta.value = value.slice(0, from) + next + value.slice(to);
  const delta = next.length - sel.length;
  ta.setSelectionRange(start, end + delta);
  scheduleSave();
}

function handleSmartPaste(e) {
  if (!state.settings.auto_pair) return false; // share the toggle for predictability
  const ta = els.body;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const data = (e.clipboardData || window.clipboardData);
  if (!data) return false;
  const text = data.getData('text/plain');
  if (!text) return false;
  // 1) URL-on-selection → wraps as [sel](url)
  if (start !== end && /^https?:\/\/\S+$/.test(text)) {
    e.preventDefault();
    const sel = ta.value.slice(start, end);
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    ta.value = before + '[' + sel + '](' + text + ')' + after;
    const np = before.length + 1 + sel.length + 2 + text.length + 1;
    ta.setSelectionRange(np, np);
    scheduleSave();
    return true;
  }
  // 2) v0.58 — TSV (tab-separated, ≥2 cols, ≥2 rows) → render as Markdown table
  const md = tsvToMarkdownTable(text);
  if (md) {
    e.preventDefault();
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    ta.value = before + md + after;
    const np = before.length + md.length;
    ta.setSelectionRange(np, np);
    scheduleSave();
    return true;
  }
  return false;
}

// v0.58 — minimal TSV → Markdown table converter. Returns null if the text doesn't
// look like a table (≥2 rows, ≥2 columns, all rows have the same column count).
function tsvToMarkdownTable(text) {
  if (!text || text.length > 50000) return null;
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.length > 0);
  if (lines.length < 2) return null;
  const rows = lines.map(l => l.split('\t'));
  const cols = rows[0].length;
  if (cols < 2) return null;
  if (!rows.every(r => r.length === cols)) return null;
  const escCell = (c) => String(c).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const head = '| ' + rows[0].map(escCell).join(' | ') + ' |';
  const sep = '| ' + Array(cols).fill('---').join(' | ') + ' |';
  const body = rows.slice(1).map(r => '| ' + r.map(escCell).join(' | ') + ' |').join('\n');
  return '\n' + head + '\n' + sep + '\n' + body + '\n';
}

function stripTrailingWhitespace(s) {
  return s.split('\n').map(line => line.replace(/[ \t]+$/, '')).join('\n');
}

// v0.54 — Tag autocomplete (when typing `#x` in editor body)
state.tagAuto = null;
function ensureTagPopover() {
  let pop = document.getElementById('tag-pop');
  if (pop) return pop;
  pop = document.createElement('ul');
  pop.id = 'tag-pop';
  pop.className = 'wiki-pop hidden'; // reuse the same pop styling
  document.body.appendChild(pop);
  return pop;
}
function closeTagAutocomplete() {
  const pop = document.getElementById('tag-pop');
  if (pop) pop.classList.add('hidden');
  state.tagAuto = null;
}
async function maybeOpenTagAutocomplete() {
  if (!state.activeId) return;
  const ta = els.body;
  const caret = ta.selectionStart;
  const upto = ta.value.slice(0, caret);
  const lineStart = upto.lastIndexOf('\n') + 1;
  const lineUpto = upto.slice(lineStart);
  // Find the last `#` not preceded by alphanumeric on the line.
  let hash = -1;
  for (let i = lineUpto.length - 1; i >= 0; i--) {
    const ch = lineUpto[i];
    if (ch === '#') {
      const prev = i > 0 ? lineUpto[i - 1] : ' ';
      if (!/[A-Za-z0-9_-]/.test(prev)) { hash = i; }
      break;
    }
    if (!/[A-Za-z0-9_-]/.test(ch)) break;
  }
  if (hash < 0) { closeTagAutocomplete(); return; }
  const after = lineUpto.slice(hash + 1);
  if (!/^[A-Za-z0-9_-]*$/.test(after)) { closeTagAutocomplete(); return; }
  if (after.length < 1) { closeTagAutocomplete(); return; }
  const query = after.toLowerCase();
  let tags = [];
  try { tags = await invoke('all_tags'); } catch (_) { tags = []; }
  const matches = tags
    .filter(([t]) => t.includes(query))
    .sort((a, b) => {
      const ai = a[0].indexOf(query), bi = b[0].indexOf(query);
      if (ai !== bi) return ai - bi;
      return b[1] - a[1]; // higher count first
    })
    .slice(0, 8);
  if (!matches.length) { closeTagAutocomplete(); return; }
  const pop = ensureTagPopover();
  pop.innerHTML = '';
  state.tagAuto = { from: lineStart + hash, to: caret, items: matches, cursor: 0 };
  matches.forEach((m, idx) => {
    const li = document.createElement('li');
    li.className = 'wiki-pop-item' + (idx === 0 ? ' on' : '');
    const lab = document.createElement('span'); lab.textContent = '#' + m[0];
    li.appendChild(lab);
    const hint = document.createElement('span'); hint.className = 'wiki-pop-hint';
    hint.textContent = ' ' + m[1] + ' note' + (m[1] === 1 ? '' : 's');
    li.appendChild(hint);
    li.addEventListener('mousedown', (e) => { e.preventDefault(); commitTagAutocomplete(idx); });
    pop.appendChild(li);
  });
  const r = ta.getBoundingClientRect();
  const linesBefore = upto.split('\n').length - 1;
  const lineHeight = 24;
  const top = Math.min(r.top + (linesBefore + 1) * lineHeight - ta.scrollTop + 4, window.innerHeight - 220);
  const left = Math.min(r.left + 80, window.innerWidth - 220);
  pop.style.left = left + 'px';
  pop.style.top = Math.max(r.top + 8, top) + 'px';
  pop.classList.remove('hidden');
}
function commitTagAutocomplete(index) {
  if (!state.tagAuto) return;
  const m = state.tagAuto.items[index];
  if (!m) return;
  const ta = els.body;
  const before = ta.value.slice(0, state.tagAuto.from);
  const after = ta.value.slice(state.tagAuto.to);
  const insert = '#' + m[0];
  ta.value = before + insert + after;
  const np = before.length + insert.length;
  ta.setSelectionRange(np, np);
  closeTagAutocomplete();
  scheduleSave();
}
function moveTagCursor(delta) {
  if (!state.tagAuto) return;
  const pop = document.getElementById('tag-pop');
  if (!pop) return;
  state.tagAuto.cursor = Math.max(0, Math.min(state.tagAuto.items.length - 1, state.tagAuto.cursor + delta));
  Array.from(pop.children).forEach((li, i) => li.classList.toggle('on', i === state.tagAuto.cursor));
}

// --- v0.43 helper: full set of all (non-trashed) notes for autocomplete + reorder
//      that must be filter-independent. Falls back to state.notes if the cache is empty.
state._allNotesCache = [];
async function refreshAllNotesCache() {
  try { state._allNotesCache = await invoke('list_notes'); }
  catch (_) { /* keep previous cache */ }
}
function allNotesView() {
  return state._allNotesCache && state._allNotesCache.length ? state._allNotesCache : state.notes;
}

// --- v0.11 — auto-pair brackets ---------------------------------------
const AUTO_PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
function handleAutoPair(e) {
  if (!state.settings.auto_pair) return false;
  const ta = els.body;
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const ch = e.key;
  if (!AUTO_PAIRS[ch]) return false;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const before = ta.value.slice(0, start);
  const sel = ta.value.slice(start, end);
  const after = ta.value.slice(end);
  // If selection exists, surround it.
  if (start !== end) {
    e.preventDefault();
    ta.value = before + ch + sel + AUTO_PAIRS[ch] + after;
    ta.setSelectionRange(start + 1, end + 1);
    scheduleSave();
    return true;
  }
  // Otherwise, insert the pair and place caret between.
  e.preventDefault();
  ta.value = before + ch + AUTO_PAIRS[ch] + after;
  ta.setSelectionRange(start + 1, start + 1);
  scheduleSave();
  return true;
}

// --- find & replace ---------------------------------------------------
function openFindBar() {
  if (!state.activeId) return;
  if (!els.findBar) return;
  state.find.open = true;
  state.find.lastIndex = -1;
  els.findBar.classList.remove('hidden');
  // Pre-fill find from current selection if it's short.
  const sel = els.body.value.slice(els.body.selectionStart, els.body.selectionEnd);
  if (sel && sel.length < 80 && !sel.includes('\n')) els.findInput.value = sel;
  setTimeout(() => { els.findInput.focus(); els.findInput.select(); refreshFindCount(); }, 30);
}
function closeFindBar() {
  if (!els.findBar) return;
  state.find.open = false;
  els.findBar.classList.add('hidden');
  els.body.focus();
}
function findAllOccurrences(needle) {
  if (!needle) return [];
  const hay = els.body.value;
  const out = [];
  const lcHay = hay.toLowerCase();
  const lcNeedle = needle.toLowerCase();
  let i = 0;
  while ((i = lcHay.indexOf(lcNeedle, i)) !== -1) {
    out.push(i);
    i += Math.max(1, lcNeedle.length);
  }
  return out;
}
function refreshFindCount() {
  if (!els.findInput) return;
  const needle = els.findInput.value;
  const occ = findAllOccurrences(needle);
  if (!needle) { els.findCount.textContent = ''; return; }
  if (!occ.length) { els.findCount.textContent = '0 / 0'; return; }
  const idx = state.find.lastIndex >= 0 ? occ.indexOf(state.find.lastIndex) : -1;
  els.findCount.textContent = (idx + 1) + ' / ' + occ.length;
}
function findNext() {
  const needle = els.findInput.value;
  if (!needle) { els.body.focus(); return; }
  const hay = els.body.value;
  const lcHay = hay.toLowerCase();
  const lcNeedle = needle.toLowerCase();
  let from = els.body.selectionEnd;
  if (state.find.lastIndex >= 0 && from === state.find.lastIndex + needle.length) {
    // already at last hit, move forward
  }
  let pos = lcHay.indexOf(lcNeedle, from);
  if (pos < 0) pos = lcHay.indexOf(lcNeedle, 0); // wrap
  if (pos < 0) { state.find.lastIndex = -1; refreshFindCount(); return; }
  state.find.lastIndex = pos;
  els.body.focus();
  els.body.setSelectionRange(pos, pos + needle.length);
  // Bring the match into view: rough estimate via line count.
  const linesBefore = hay.slice(0, pos).split('\n').length - 1;
  els.body.scrollTop = Math.max(0, (linesBefore - 4) * 24);
  refreshFindCount();
}
function replaceCurrent() {
  const needle = els.findInput.value;
  if (!needle) return;
  const replace = els.replaceInput.value;
  const sel = els.body.value.slice(els.body.selectionStart, els.body.selectionEnd);
  if (sel.toLowerCase() === needle.toLowerCase()) {
    const start = els.body.selectionStart;
    const before = els.body.value.slice(0, start);
    const after = els.body.value.slice(els.body.selectionEnd);
    els.body.value = before + replace + after;
    els.body.setSelectionRange(start + replace.length, start + replace.length);
    state.find.lastIndex = -1;
    scheduleSave();
  }
  findNext();
}
function replaceAll() {
  const needle = els.findInput.value;
  if (!needle) return;
  const replace = els.replaceInput.value;
  const hay = els.body.value;
  // Case-insensitive whole-string replace via index walk to preserve casing of replacement.
  let out = '';
  let i = 0;
  const lcHay = hay.toLowerCase();
  const lcNeedle = needle.toLowerCase();
  let count = 0;
  while (i < hay.length) {
    const at = lcHay.indexOf(lcNeedle, i);
    if (at < 0) { out += hay.slice(i); break; }
    out += hay.slice(i, at) + replace;
    i = at + needle.length;
    count++;
  }
  if (!count) { setStatus('No matches.'); return; }
  els.body.value = out;
  scheduleSave();
  state.find.lastIndex = -1;
  setStatus('Replaced ' + count + ' match' + (count === 1 ? '' : 'es') + '.');
  refreshFindCount();
}

async function refreshLockUi() {
  try {
    const s = await invoke('lock_status');
    state.lockEnabled = !!s.enabled;
    state.locked = !!s.locked;
    if (state.locked) showLockScreen(); else hideLockScreen();
    setupIdleAutoLock(); // v0.40 — re-bind based on new lockEnabled state
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
  try {
    await invoke('lock_now');
    state.locked = true;
    if (state.notePassphrases) state.notePassphrases.clear(); // v0.67
    closeSettings();
    showLockScreen();
  } catch (e) { alert('Lock failed: ' + e); }
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
  { name: 'Find & replace in note', shortcut: 'Ctrl+H', run: openFindBar },
  { name: 'Toggle reading mode', shortcut: 'Ctrl+Shift+M', run: toggleReadingMode },
  { name: 'Open random note', shortcut: 'Ctrl+R', run: openRandomNote },
  { name: 'Print / save as PDF', shortcut: 'Ctrl+P', run: printActiveNote },
  { name: 'Show orphan notes (no links in or out)', shortcut: '', run: openOrphans },
  { name: 'Filter notes by property...', shortcut: '', run: promptFilterByProperty },
  { name: 'Copy current note as Markdown', shortcut: '', run: copyActiveAsMarkdown },
  { name: 'Copy current note as HTML', shortcut: '', run: copyActiveAsHtml },
  { name: 'Save current note as standalone .html', shortcut: '', run: saveActiveAsHtml },
  { name: 'Encrypted workspace backup...', shortcut: '', run: exportWorkspaceEncrypted },
  { name: 'Encrypt this note (passphrase)...', shortcut: '', run: encryptCurrentNote },
  { name: 'Unlock this note (passphrase)...', shortcut: '', run: unlockCurrentNote },
  { name: 'Permanently decrypt this note', shortcut: '', run: decryptCurrentNotePermanently },
  { name: 'Import multiple Markdown files...', shortcut: '', run: importMultipleMd },
  { name: 'Toggle sidebar', shortcut: 'Ctrl+\\', run: toggleSidebar },
  { name: 'Tabs: next', shortcut: 'Ctrl+Tab', run: () => cycleTab(1) },
  { name: 'Tabs: previous', shortcut: 'Ctrl+Shift+Tab', run: () => cycleTab(-1) },
  { name: 'Tabs: close current', shortcut: 'Ctrl+W', run: () => state.activeId && closeTab(state.activeId) },
  { name: 'Tabs: close all', shortcut: '', run: () => { state.tabs = []; saveTabs(); showEmpty(); renderTabs(); } },
  { name: 'Navigate back', shortcut: 'Alt+←', run: navBack },
  { name: 'Navigate forward', shortcut: 'Alt+→', run: navForward },
  { name: 'Search every note...', shortcut: 'Ctrl+Shift+F', run: openSearchModal },
  { name: 'Editor: delete current line', shortcut: 'Ctrl+Shift+K', run: () => { if (els.body) { els.body.focus(); deleteCurrentLine(); } } },
  { name: 'Editor: duplicate current line', shortcut: 'Ctrl+Shift+D', run: () => { if (els.body) { els.body.focus(); duplicateCurrentLine(); } } },
  { name: 'Editor: toggle HTML comment', shortcut: 'Ctrl+/', run: () => { if (els.body) { els.body.focus(); toggleComment(); } } },
  { name: 'Rename current note...', shortcut: 'F2', run: promptRenameNote },
  { name: 'Edit note properties (frontmatter)...', shortcut: '', run: openPropsModal },
  { name: 'Reveal current note file in OS', shortcut: '', run: async () => {
      if (!state.activeId) { alert('Open a note first.'); return; }
      try { await invoke('reveal_note', { id: state.activeId }); }
      catch (e) { alert('Reveal failed: ' + e); }
  } },
  // v0.60 — quick wins
  { name: 'New note from clipboard', shortcut: '', run: async () => {
      let text = '';
      try { text = await navigator.clipboard.readText(); } catch (_) { text = ''; }
      if (!text || !text.trim()) { alert('Clipboard is empty (or permission denied).'); return; }
      const lines = text.replace(/\r\n?/g, '\n').split('\n');
      const title = (lines[0] || '').trim().replace(/^#+\s*/, '').slice(0, 120) || 'From clipboard';
      const body = text;
      try {
        const note = await invoke('create_note', { title, body });
        await loadNotes(); openNote(note.id);
      } catch (e) { alert('Create failed: ' + e); }
  } },
  { name: 'Insert today\'s date at caret', shortcut: '', run: () => {
      if (!els.body) return;
      const d = new Date();
      const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      insertAtCursor(els.body, s);
      scheduleSave();
  } },
  { name: 'Insert current time at caret', shortcut: '', run: () => {
      if (!els.body) return;
      const d = new Date();
      const s = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      insertAtCursor(els.body, s);
      scheduleSave();
  } },
  { name: 'Start focus timer', shortcut: '', run: () => startPomodoro(state.settings.pomodoro_minutes || 25) },
  { name: 'Cancel focus timer', shortcut: '', run: () => cancelPomodoro() },
  { name: 'Toggle always-on-top window', shortcut: '', run: async () => {
      state.alwaysOnTop = !state.alwaysOnTop;
      try {
        await invoke('set_always_on_top', { value: !!state.alwaysOnTop });
        setStatus('Always-on-top: ' + (state.alwaysOnTop ? 'ON' : 'OFF'));
      } catch (e) { alert('Failed: ' + e); }
  } },
  { name: 'Compare current note with another...', shortcut: '', run: compareWithNote },
  { name: 'Show this note\'s top words', shortcut: '', run: () => {
      if (!state.activeId) { alert('Open a note first.'); return; }
      const text = (els.body && els.body.value) || '';
      const stop = new Set([
        'the','a','an','of','to','and','or','but','is','are','was','were','in','on','at','by','for','with','as','be','been','being','have','has','had','do','does','did','will','would','shall','should','can','could','may','might','must','this','that','these','those','i','you','he','she','we','they','it','me','him','her','us','them','my','your','his','their','its','our','if','then','than','so','up','down','out','from','into','about','over','under','more','most','some','any','no','not','only','just','also','very','too','such','what','which','who','whom','whose','where','when','why','how','all','each','every','many','much','few','other','another','same','own','new','old','see'
      ]);
      const counts = new Map();
      for (const raw of text.split(/[^A-Za-z0-9'\-]+/)) {
        const w = (raw || '').toLowerCase().replace(/^[-']+|[-']+$/g, '');
        if (w.length < 4) continue;
        if (stop.has(w)) continue;
        if (/^\d+$/.test(w)) continue;
        counts.set(w, (counts.get(w) || 0) + 1);
      }
      const top = Array.from(counts.entries()).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0, 30);
      if (!top.length) { alert('No words.'); return; }
      const lines = top.map(([w, c], i) => `${(i+1).toString().padStart(2,' ')}. ${w}  (${c})`);
      alert('Top words in this note:\n\n' + lines.join('\n'));
  } },
  { name: 'Show top 30 words across all notes', shortcut: '', run: async () => {
    try {
      const top = await invoke('top_words', { limit: 30 });
      if (!top.length) { alert('No words yet — write some notes first.'); return; }
      const lines = top.map(([w, c], i) => `${(i + 1).toString().padStart(2,' ')}. ${w}  (${c})`);
      alert('Top words across the workspace:\n\n' + lines.join('\n'));
    } catch (e) { alert('Failed: ' + e); }
  } },
  { name: 'Duplicate current note as...', shortcut: '', run: async () => {
    if (!state.activeId) return;
    const newTitle = prompt('New title for the copy:', (state.active && state.active.title || 'Untitled') + ' (copy)');
    if (newTitle === null) return;
    try {
      const dup = await invoke('duplicate_note', { id: state.activeId });
      await invoke('update_note', { id: dup.id, title: newTitle, body: null });
      await loadNotes(); openNote(dup.id);
    } catch (e) { alert('Duplicate failed: ' + e); }
  } },
  { name: 'Editor: increase font', shortcut: 'Ctrl+=', run: () => bumpFontSize(1) },
  { name: 'Editor: decrease font', shortcut: 'Ctrl+-', run: () => bumpFontSize(-1) },
  { name: 'Editor: reset font size', shortcut: 'Ctrl+0', run: resetFontSize },
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
  // v0.12 — recently opened notes ranked above plain note matches when no query.
  if (!q && state.recents && state.recents.length) {
    for (const id of state.recents) {
      const n = state.notes.find(x => x.id === id);
      if (!n) continue;
      const title = n.title || 'Untitled';
      items.push({ kind: 'recent', noteId: id, label: title, hint: 'recent · ' + fmtDate(n.updated_at), score: 100, run: () => openNote(id) });
    }
  }
  for (const n of state.notes) {
    const title = n.title || 'Untitled';
    const s = fuzzyScore(title, q);
    if (s > 0 || !q) items.push({ kind: 'note', noteId: n.id, label: title, hint: 'open · ' + fmtDate(n.updated_at), score: s + (n.pinned ? 2 : 0), run: () => openNote(n.id) });
  }
  // v0.43 — de-duplicate notes/recents by note id (so a note that's also recent doesn't appear twice),
  // and commands by their label. Highest-scoring entry wins.
  const seen = new Map();
  for (const it of items) {
    const k = it.noteId ? 'note:' + it.noteId : 'cmd:' + it.label;
    const prev = seen.get(k);
    if (!prev || it.score > prev.score) seen.set(k, it);
  }
  const merged = Array.from(seen.values());
  merged.sort((a, b) => b.score - a.score);
  state.palette.items = merged.slice(0, 14);
  state.palette.cursor = 0;
  renderPaletteResults();
}
function renderPaletteResults() {
  els.cmdResults.innerHTML = '';
  state.palette.items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'cmd-result' + (i === state.palette.cursor ? ' on' : '');
    const k = document.createElement('span'); k.className = 'cmd-kind';
    k.textContent = item.kind === 'cmd' ? '⌘' : item.kind === 'recent' ? '⏱' : '◌';
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
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); openSearchModal(); return; }

  // v0.35 — sidebar keyboard navigation when focus isn't in a writable field.
  if (!inField) {
    if (e.key === 'ArrowDown' && state.notes.length) { e.preventDefault(); navigateNoteList(1); return; }
    if (e.key === 'ArrowUp' && state.notes.length) { e.preventDefault(); navigateNoteList(-1); return; }
    if (e.key === 'Home' && state.notes.length) { e.preventDefault(); navigateNoteListAbs(0); return; }
    if (e.key === 'End' && state.notes.length) { e.preventDefault(); navigateNoteListAbs(state.notes.length - 1); return; }
    if (e.key === 'Enter' && state.activeId) { e.preventDefault(); els.body && els.body.focus(); return; }
    if (e.key === 'Delete' && state.activeId) { e.preventDefault(); deleteActive(); return; }
    if (e.key === 'F2' && state.activeId) { e.preventDefault(); promptRenameNote(); return; }
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); newNote(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'h') { e.preventDefault(); openFindBar(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'd' && !inField) { e.preventDefault(); newDailyNote(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'd' && inField && target === els.title) { e.preventDefault(); newDailyNote(); return; }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') { e.preventDefault(); toggleReadingMode(); return; }
  if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'm') { e.preventDefault(); togglePreview(); return; }
  if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'r' && !inField) { e.preventDefault(); openRandomNote(); return; }
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); bumpFontSize(1); return; }
  if (e.ctrlKey && e.key === '-') { e.preventDefault(); bumpFontSize(-1); return; }
  if (e.ctrlKey && e.key === '0') { e.preventDefault(); resetFontSize(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'p') { e.preventDefault(); printActiveNote(); return; }
  if (e.ctrlKey && e.key === '\\') { e.preventDefault(); toggleSidebar(); return; }
  // v0.29 — tab shortcuts
  if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); cycleTab(1); return; }
  if (e.ctrlKey && e.key === 'Tab' && e.shiftKey) { e.preventDefault(); cycleTab(-1); return; }
  if (e.ctrlKey && e.key.toLowerCase() === 'w') { e.preventDefault(); if (state.activeId) closeTab(state.activeId); return; }
  if (e.altKey && e.key === 'ArrowUp' && target === els.body) { e.preventDefault(); moveLine(-1); return; }
  if (e.altKey && e.key === 'ArrowDown' && target === els.body) { e.preventDefault(); moveLine(1); return; }
  // v0.57 — back/forward navigation across opened notes (browser-style).
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'ArrowLeft') { e.preventDefault(); navBack(); return; }
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'ArrowRight') { e.preventDefault(); navForward(); return; }
  // v0.63 — Ctrl+1..9 opens the Nth pinned note (by display_order, then updated_at).
  if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
    const n = parseInt(e.key, 10);
    const pinned = ((state._allNotesCache && state._allNotesCache.length ? state._allNotesCache : state.notes) || [])
      .filter(x => x.pinned && !x.trashed_at)
      .slice()
      .sort((a, b) => {
        const ao = a.display_order && a.display_order > 0 ? a.display_order : Number.MAX_SAFE_INTEGER;
        const bo = b.display_order && b.display_order > 0 ? b.display_order : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return (b.updated_at || '').localeCompare(a.updated_at || '');
      });
    const target = pinned[n - 1];
    if (target) { e.preventDefault(); openNote(target.id); return; }
    // Don't preventDefault if there's no Nth pinned note — let other handlers run normally.
  }
  if (e.ctrlKey && e.key === 's')               { e.preventDefault(); if (state.pendingTimer) clearTimeout(state.pendingTimer); state.pendingTimer = null; flushSave(); return; }
  // v0.33 — Ctrl+/ toggles comment in editor; falls back to cheatsheet elsewhere.
  if (e.ctrlKey && e.key === '/' && target === els.body) { e.preventDefault(); toggleComment(); return; }
  if (e.ctrlKey && e.key === '/')               { e.preventDefault(); openCheatsheet(); return; }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'k' && target === els.body) { e.preventDefault(); deleteCurrentLine(); return; }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd' && target === els.body) { e.preventDefault(); duplicateCurrentLine(); return; }
  if (target === els.body && e.ctrlKey && e.key.toLowerCase() === 'b') { e.preventDefault(); applyFormat('bold'); return; }
  if (target === els.body && e.ctrlKey && e.key.toLowerCase() === 'i') { e.preventDefault(); applyFormat('italic'); return; }
  if (target === els.body && e.ctrlKey && e.key.toLowerCase() === 'e') { e.preventDefault(); applyFormat('code'); return; }
  if (target === els.body && e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); applyFormat('link'); return; }
  if (e.ctrlKey && e.key === ',')               { e.preventDefault(); cycleTheme(); return; }
  if (e.key === '/' && !inField)                { e.preventDefault(); els.search.focus(); return; }
  // v0.59 — try custom user-defined shortcuts before defaults so users can override
  // anything they want; defaults still win on key conflict because we already ran above.
  if (tryRunCustomShortcut(e)) return;

  if (e.key === 'Escape') {
    if (state.searchModal.open) { closeSearchModal(); return; }
    if (els.diffModal && !els.diffModal.classList.contains('hidden')) { closeDiffModal(); return; }
    if (els.propsModal && !els.propsModal.classList.contains('hidden')) { closePropsModal(); return; }
    if (!els.cheatsheetModal.classList.contains('hidden')) { closeCheatsheet(); return; }
    if (!els.historyModal.classList.contains('hidden')) { closeHistory(); return; }
    if (!els.modalBackdrop.classList.contains('hidden')) { closeSettings(); return; }
    if (state.find.open) { closeFindBar(); return; }
    if (state.reading) { toggleReadingMode(); return; }
    if (state.selectedIds.size) { clearSelection(); return; }
    if (!els.selToolbar.classList.contains('hidden')) { hideSelToolbar(); return; }
    if (target === els.search) { els.search.value = ''; state.query = ''; loadNotes(); els.search.blur(); return; }
    // v0.46 — Esc with no other modal/selection clears any active filter pill.
    if (els.filterPill && !els.filterPill.classList.contains('hidden')) { clearActiveFilter(); return; }
  }
});

els.newNote.addEventListener('click', newNote);
els.themeBtn.addEventListener('click', cycleTheme);
els.cmdBtn.addEventListener('click', openPalette);
els.deleteBtn.addEventListener('click', deleteActive);
els.pinBtn.addEventListener('click', togglePin);
els.previewBtn.addEventListener('click', togglePreview);
if (els.readingBtn) els.readingBtn.addEventListener('click', toggleReadingMode);
els.exportBtn.addEventListener('click', exportActiveMd);
els.title.addEventListener('input', scheduleSave);
els.body.addEventListener('input', () => { scheduleSave(); maybeOpenWikiAutocomplete(); maybeOpenTagAutocomplete(); });
// v0.32 — remember scroll position per note (debounced).
els.body.addEventListener('scroll', () => {
  if (!state.activeId) return;
  clearTimeout(els._scrollTimer);
  els._scrollTimer = setTimeout(() => rememberScroll(state.activeId, els.body.scrollTop), 200);
  // v0.42 — synced scroll into preview when split view is active.
  syncScrollFrom('body');
});
els.preview.addEventListener('scroll', () => syncScrollFrom('preview'));
state._syncScrolling = false;
function syncScrollFrom(source) {
  if (!state.settings.sync_scroll) return;
  if (!state.preview) return;
  if (state._syncScrolling) return;
  if (els.preview.classList.contains('hidden')) return;
  const src = source === 'body' ? els.body : els.preview;
  const dst = source === 'body' ? els.preview : els.body;
  const srcMax = Math.max(1, src.scrollHeight - src.clientHeight);
  const dstMax = Math.max(0, dst.scrollHeight - dst.clientHeight);
  const ratio = src.scrollTop / srcMax;
  state._syncScrolling = true;
  dst.scrollTop = ratio * dstMax;
  requestAnimationFrame(() => { state._syncScrolling = false; });
}
if (els.optSyncScroll) els.optSyncScroll.addEventListener('change', saveSettings);
els.body.addEventListener('click', () => { closeWikiAutocomplete(); });
els.body.addEventListener('keydown', (e) => {
  // Wiki autocomplete navigation comes first.
  if (state.wikiAuto && !document.getElementById('wiki-pop').classList.contains('hidden')) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveWikiCursor(1); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); moveWikiCursor(-1); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitWikiAutocomplete(state.wikiAuto.cursor); return; }
    if (e.key === 'Escape') { e.preventDefault(); closeWikiAutocomplete(); return; }
  }
  // v0.54 — tag autocomplete navigation
  if (state.tagAuto) {
    const tp = document.getElementById('tag-pop');
    if (tp && !tp.classList.contains('hidden')) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveTagCursor(1); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); moveTagCursor(-1); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitTagAutocomplete(state.tagAuto.cursor); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeTagAutocomplete(); return; }
    }
  }
  if (handleSmartEnter(e)) return;
  // v0.25 — try snippet expansion before smartTab so ;name+Tab wins.
  if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (tryExpandSnippet()) { e.preventDefault(); return; }
  }
  if (handleSmartTab(e)) return;
  handleAutoPair(e);
});
els.body.addEventListener('paste', (e) => { handleSmartPaste(e); }, { capture: true });
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
if (els.viewOrphans) els.viewOrphans.addEventListener('click', openOrphans);
if (els.viewTasks) els.viewTasks.addEventListener('click', openTasks);
if (els.tasksRefreshBtn) els.tasksRefreshBtn.addEventListener('click', refreshTasksView);
if (els.tasksIncludeDone) els.tasksIncludeDone.addEventListener('change', refreshTasksView);
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
  // v0.43 — close wiki autocomplete popover when clicking anywhere outside it (and outside the body editor).
  const pop = document.getElementById('wiki-pop');
  if (state.wikiAuto && pop && !pop.classList.contains('hidden')) {
    if (!pop.contains(e.target) && e.target !== els.body) closeWikiAutocomplete();
  }
  // v0.54 — close tag autocomplete popover too
  const tpop = document.getElementById('tag-pop');
  if (state.tagAuto && tpop && !tpop.classList.contains('hidden')) {
    if (!tpop.contains(e.target) && e.target !== els.body) closeTagAutocomplete();
  }
});

els.historyBtn.addEventListener('click', openHistory);
els.hmClose.addEventListener('click', closeHistory);
els.historyModal.addEventListener('click', (e) => { if (e.target === els.historyModal) closeHistory(); });
els.hmPurgeBtn.addEventListener('click', purgeHistoryActive);
els.attachBtn.addEventListener('click', pickAttachment);
els.exportWorkspaceBtn.addEventListener('click', exportWorkspace);
els.importWorkspaceBtn.addEventListener('click', importWorkspace);
if (els.exportWorkspaceEncBtn) els.exportWorkspaceEncBtn.addEventListener('click', exportWorkspaceEncrypted);
if (els.optBackupReminder) els.optBackupReminder.addEventListener('change', saveSettings);
if (els.navBackBtn) els.navBackBtn.addEventListener('click', navBack);
if (els.navFwdBtn) els.navFwdBtn.addEventListener('click', navForward);
if (els.optTrashDays) els.optTrashDays.addEventListener('change', saveSettings);
if (els.optAutoWikiLink) els.optAutoWikiLink.addEventListener('change', () => { saveSettings(); if (state.preview) renderPreview(); });
if (els.optPomodoro) els.optPomodoro.addEventListener('change', saveSettings);
if (els.optAutoLockIdle) els.optAutoLockIdle.addEventListener('change', saveSettings);
if (els.diffClose) els.diffClose.addEventListener('click', closeDiffModal);
if (els.propsBtn) els.propsBtn.addEventListener('click', openPropsModal);
if (els.propsClose) els.propsClose.addEventListener('click', closePropsModal);
if (els.propsModal) els.propsModal.addEventListener('click', (e) => { if (e.target === els.propsModal) closePropsModal(); });
if (els.propsAddBtn) els.propsAddBtn.addEventListener('click', () => { state.propsForm.push({ key: '', value: '' }); renderPropsForm(); });
if (els.propsSaveBtn) els.propsSaveBtn.addEventListener('click', savePropsForm);
if (els.filterPillClear) els.filterPillClear.addEventListener('click', clearActiveFilter);
if (els.diffModal) els.diffModal.addEventListener('click', (e) => { if (e.target === els.diffModal) closeDiffModal(); });
if (els.pomodoro) els.pomodoro.addEventListener('click', () => { if (state.pomodoro.interval) cancelPomodoro(); else startPomodoro(state.settings.pomodoro_minutes); });
if (els.purgeNowBtn) els.purgeNowBtn.addEventListener('click', async () => {
  const n = await purgeEligibleTrash();
  refreshTrashBadge();
  if (n === 0) alert('No trashed notes are old enough to purge.');
});

// v0.30 — Search modal listeners
if (els.searchModalInput) {
  els.searchModalInput.addEventListener('input', () => {
    clearTimeout(state.searchModal.debounce);
    state.searchModal.debounce = setTimeout(refreshSearchModal, 120);
  });
  els.searchModalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeSearchModal(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSearchCursor(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveSearchCursor(-1); return; }
    if (e.key === 'Enter') { e.preventDefault(); activateSearchSelection(); return; }
  });
}
if (els.searchModal) els.searchModal.addEventListener('click', (e) => { if (e.target === els.searchModal) closeSearchModal(); });

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
if (els.optLocale) els.optLocale.addEventListener('change', () => { saveSettings(); renderList(); refreshBulkBar(); });
if (els.optAutoPair) els.optAutoPair.addEventListener('change', saveSettings);
if (els.optSmartLists) els.optSmartLists.addEventListener('change', saveSettings);
if (els.optStripTrailingWs) els.optStripTrailingWs.addEventListener('change', saveSettings);
if (els.optWordWrap) els.optWordWrap.addEventListener('change', saveSettings);
if (els.optSmartTypography) els.optSmartTypography.addEventListener('change', saveSettings);
if (els.optEditorFontSize) els.optEditorFontSize.addEventListener('change', saveSettings);
if (els.printBtn) els.printBtn.addEventListener('click', printActiveNote);
if (els.copyMdBtn) els.copyMdBtn.addEventListener('click', copyActiveAsMarkdown);
if (els.importMdMultiBtn) els.importMdMultiBtn.addEventListener('click', importMultipleMd);
if (els.optQuickCapture) els.optQuickCapture.addEventListener('change', saveSettings);
if (els.sidebarHideBtn) els.sidebarHideBtn.addEventListener('click', toggleSidebar);
if (els.sidebarToggle) els.sidebarToggle.addEventListener('click', toggleSidebar);
if (els.sidebarDivider) els.sidebarDivider.addEventListener('mousedown', startSidebarResize);
if (els.snipAddBtn) els.snipAddBtn.addEventListener('click', addSnippetRow);
if (els.snipSaveBtn) els.snipSaveBtn.addEventListener('click', saveSnippetsFromTable);
if (els.snipResetBtn) els.snipResetBtn.addEventListener('click', resetSnippetsToDefaults);

if (els.bulkPin) els.bulkPin.addEventListener('click', () => bulkPin(true));
if (els.bulkUnpin) els.bulkUnpin.addEventListener('click', () => bulkPin(false));
if (els.bulkExport) els.bulkExport.addEventListener('click', bulkExportSelected);
if (els.bulkMerge) els.bulkMerge.addEventListener('click', bulkMergeSelected);
if (els.bulkProp) els.bulkProp.addEventListener('click', bulkSetProperty);
if (els.bulkTrash) els.bulkTrash.addEventListener('click', bulkTrashSelected);
if (els.bulkClear) els.bulkClear.addEventListener('click', () => clearSelection());

if (els.findCloseBtn) els.findCloseBtn.addEventListener('click', closeFindBar);
if (els.findNextBtn)  els.findNextBtn.addEventListener('click', findNext);
if (els.findReplaceBtn) els.findReplaceBtn.addEventListener('click', replaceCurrent);
if (els.findReplaceAllBtn) els.findReplaceAllBtn.addEventListener('click', replaceAll);
if (els.findInput) {
  els.findInput.addEventListener('input', refreshFindCount);
  els.findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); findNext(); }
    if (e.key === 'Escape') { e.preventDefault(); closeFindBar(); }
  });
}
if (els.replaceInput) {
  els.replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); replaceCurrent(); }
    if (e.key === 'Escape') { e.preventDefault(); closeFindBar(); }
  });
}

window.addEventListener('beforeunload', () => {
  if (state.pendingTimer) { clearTimeout(state.pendingTimer); flushSave(); }
  for (const w of state.pluginWorkers.values()) { try { w.terminate(); } catch (e) {} }
});

els.lockUnlockBtn.addEventListener('click', attemptUnlock);
els.lockPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptUnlock(); });

async function refreshDashboard() {
  if (!els.dashGrid) return;
  try {
    const stats = await invoke('dashboard_stats');
    const cells = [
      { label: 'Notes', value: stats.total_notes },
      { label: 'Words', value: (stats.total_words || 0).toLocaleString() },
      { label: 'Characters', value: (stats.total_chars || 0).toLocaleString() },
      { label: 'Pinned', value: stats.pinned },
      { label: 'Wiki-links', value: stats.links },
      // v0.43 — use the full distinct count (top_tags is truncated to 10 server-side).
      { label: 'Tags', value: (stats.distinct_tags != null ? stats.distinct_tags : (stats.top_tags || []).length) },
      // v0.49 — streak + writing-time + active days
      { label: 'Streak (days)', value: stats.streak_days || 0 },
      { label: 'Active days', value: stats.active_days || 0 },
      { label: 'Avg words / active day', value: (stats.avg_words_per_active_day || 0).toLocaleString() },
      { label: 'Writing time', value: fmtMinutes(stats.writing_minutes || 0) },
    ];
    els.dashGrid.innerHTML = '';
    for (const c of cells) {
      const card = document.createElement('div');
      card.className = 'dash-card';
      const v = document.createElement('div'); v.className = 'dash-val'; v.textContent = c.value;
      const l = document.createElement('div'); l.className = 'dash-lbl'; l.textContent = c.label;
      card.appendChild(v); card.appendChild(l);
      els.dashGrid.appendChild(card);
    }
    els.dashTags.innerHTML = '';
    if (!stats.top_tags || !stats.top_tags.length) {
      const li = document.createElement('li');
      li.style.background = 'transparent'; li.style.color = 'var(--text-3)'; li.style.fontSize = '12.5px';
      li.textContent = 'No tags yet. Add #tag in any note body.';
      els.dashTags.appendChild(li);
    } else {
      for (const [tag, count] of stats.top_tags) {
        const li = document.createElement('li');
        const main = document.createElement('div'); main.className = 'row-main';
        const name = document.createElement('div'); name.className = 'row-name'; name.textContent = '#' + tag;
        const sub = document.createElement('div'); sub.className = 'row-sub'; sub.textContent = count + ' note' + (count === 1 ? '' : 's');
        main.appendChild(name); main.appendChild(sub);
        li.appendChild(main);
        const actions = document.createElement('div'); actions.className = 'row-actions';
        actions.appendChild(btn('ghost-btn', 'Filter', () => { state.activeTag = tag; closeSettings(); renderTagBar(); renderList(); }));
        li.appendChild(actions);
        els.dashTags.appendChild(li);
      }
    }
  } catch (e) { console.error('dashboard stats:', e); }

  try {
    const cal = await invoke('calendar_data');
    drawHeatmap(els.dashCal, cal);
  } catch (e) { console.error('calendar:', e); }

  try {
    const g = await invoke('graph_data');
    drawGraph(els.dashGraph, g);
  } catch (e) { console.error('graph:', e); }
}

function drawHeatmap(container, data) {
  // v0.43 — render as 12 week-columns × 7 day-rows in CSS grid order, using UTC dates
  // throughout to match the backend's UTC YYYY-MM-DD keys (no off-by-one timezone bugs).
  container.innerHTML = '';
  const map = new Map(data.map(([k, v]) => [k, v]));
  const weeks = 12;
  const days = weeks * 7;
  let max = 0;
  for (const [, v] of data) if (v > max) max = v;
  // Anchor on today (UTC) and walk backwards.
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  // Build a flat ordered list (oldest→newest) of (weekColumn, dayRow, key, count).
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const ts = todayUtc - i * 86400000;
    const d = new Date(ts);
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, value: map.get(key) || 0, weekday: d.getUTCDay() });
  }
  // 7 rows (Sun..Sat) × 12 cols. CSS grid is column-major when grid-auto-flow:column.
  const grid = document.createElement('div'); grid.className = 'cal-grid';
  // Walk weeks (col) outer, days (row) inner.
  let i = 0;
  while (i < cells.length) {
    // The first column may be partial (week starts mid-week). Pad earlier days as empty.
    const firstCol = (i === 0);
    if (firstCol) {
      const startWeekday = cells[0].weekday;
      for (let r = 0; r < startWeekday; r++) {
        const pad = document.createElement('div');
        pad.className = 'cal-cell empty-pad';
        pad.style.background = 'transparent';
        grid.appendChild(pad);
      }
      for (let r = startWeekday; r < 7 && i < cells.length; r++, i++) {
        appendHeatCell(grid, cells[i], max);
      }
    } else {
      for (let r = 0; r < 7 && i < cells.length; r++, i++) {
        appendHeatCell(grid, cells[i], max);
      }
    }
  }
  container.appendChild(grid);
}
function appendHeatCell(grid, c, max) {
  const cell = document.createElement('div');
  cell.className = 'cal-cell';
  const intensity = max > 0 ? (c.value / max) : 0;
  cell.style.background = c.value === 0
    ? 'var(--bg-3)'
    : `color-mix(in srgb, var(--accent) ${Math.round(20 + intensity * 80)}%, var(--bg-3))`;
  cell.title = `${c.key}: ${c.value} note${c.value === 1 ? '' : 's'}`;
  grid.appendChild(cell);
}

function drawGraph(canvas, data) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!data.nodes || !data.nodes.length) {
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-3');
    ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('No notes with [[wiki-links]] yet.', W / 2, H / 2);
    return;
  }
  // v0.43 — guard against UI freeze on large graphs.
  // Cap node count: prefer pinned nodes + nodes touched by an edge.
  const MAX_NODES = 100;
  let inputNodes = data.nodes;
  let inputEdges = data.edges || [];
  let truncated = false;
  if (inputNodes.length > MAX_NODES) {
    truncated = true;
    const linked = new Set();
    for (const e of inputEdges) { linked.add(e.source); linked.add(e.target); }
    const sorted = inputNodes.slice().sort((a, b) => {
      // pinned first, then linked, then by size (= note body length proxy)
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const al = linked.has(a.id), bl = linked.has(b.id);
      if (al !== bl) return al ? -1 : 1;
      return (b.size || 0) - (a.size || 0);
    });
    inputNodes = sorted.slice(0, MAX_NODES);
    const keep = new Set(inputNodes.map(n => n.id));
    inputEdges = inputEdges.filter(e => keep.has(e.source) && keep.has(e.target));
  }
  const nodes = inputNodes.map((n, i) => ({
    ...n,
    x: W / 2 + Math.cos(i / inputNodes.length * Math.PI * 2) * Math.min(W, H) * 0.32,
    y: H / 2 + Math.sin(i / inputNodes.length * Math.PI * 2) * Math.min(W, H) * 0.32,
    vx: 0, vy: 0,
  }));
  const idIdx = new Map(nodes.map((n, i) => [n.id, i]));
  const edges = inputEdges.map(e => ({ source: idIdx.get(e.source), target: idIdx.get(e.target) }))
    .filter(e => e.source !== undefined && e.target !== undefined);

  // Scale iterations down with node count: O(N^2) per iter means ~2.5M ops at 250×100 nodes.
  const iters = Math.max(40, Math.min(250, Math.round(25000 / Math.max(1, nodes.length))));
  for (let iter = 0; iter < iters; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      let fx = 0, fy = 0;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d2 = dx * dx + dy * dy + 1;
        const f = 1500 / d2;
        fx += dx * f; fy += dy * f;
      }
      const cx = W / 2 - nodes[i].x, cy = H / 2 - nodes[i].y;
      fx += cx * 0.005; fy += cy * 0.005;
      nodes[i].vx = (nodes[i].vx + fx) * 0.5;
      nodes[i].vy = (nodes[i].vy + fy) * 0.5;
    }
    for (const e of edges) {
      const a = nodes[e.source], b = nodes[e.target];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = 80;
      const f = (d - target) * 0.05;
      a.vx += dx / d * f; a.vy += dy / d * f;
      b.vx -= dx / d * f; b.vy -= dy / d * f;
    }
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(20, Math.min(W - 20, n.x));
      n.y = Math.max(20, Math.min(H - 20, n.y));
    }
  }

  const styles = getComputedStyle(document.body);
  const accent = styles.getPropertyValue('--accent') || '#7aa6ff';
  const text = styles.getPropertyValue('--text') || '#e6e6e6';
  const text3 = styles.getPropertyValue('--text-3') || '#6f7177';

  ctx.strokeStyle = text3.trim(); ctx.lineWidth = 0.5;
  for (const e of edges) {
    const a = nodes[e.source], b = nodes[e.target];
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (const n of nodes) {
    ctx.fillStyle = n.pinned ? accent.trim() : text.trim();
    ctx.beginPath(); ctx.arc(n.x, n.y, n.size || 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = text.trim(); ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  for (const n of nodes) {
    ctx.fillText(n.title.slice(0, 18), n.x, n.y - (n.size || 5) - 4);
  }
  // v0.43 — note when nodes were dropped to keep the UI responsive.
  if (truncated) {
    ctx.fillStyle = (getComputedStyle(document.body).getPropertyValue('--text-3') || '#888').trim();
    ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(`Showing top ${nodes.length} of ${data.nodes.length} notes`, W - 6, H - 6);
  }

  canvas._nodes = nodes;
}

els.dashGraph && els.dashGraph.addEventListener('click', (e) => {
  const r = els.dashGraph.getBoundingClientRect();
  const x = (e.clientX - r.left) * (els.dashGraph.width / r.width);
  const y = (e.clientY - r.top) * (els.dashGraph.height / r.height);
  const nodes = els.dashGraph._nodes || [];
  for (const n of nodes) {
    const dx = x - n.x, dy = y - n.y;
    if (dx * dx + dy * dy < (n.size || 5) * (n.size || 5) * 4) {
      closeSettings(); openNote(n.id); return;
    }
  }
});
els.dashRefreshBtn && els.dashRefreshBtn.addEventListener('click', refreshDashboard);

// --- v0.17 — Kanban board --------------------------------------------
async function refreshBoard() {
  if (!els.boardGrid) return;
  const key = (els.boardPropertyInput && els.boardPropertyInput.value.trim()) || (state.settings.board_property || 'status');
  if (els.boardPropertyInput && !els.boardPropertyInput.value) els.boardPropertyInput.value = key;
  let data;
  try { data = await invoke('board_data', { key }); }
  catch (e) { els.boardGrid.innerHTML = '<div class="board-empty">' + e + '</div>'; return; }
  els.boardGrid.innerHTML = '';
  if (!data.columns || !data.columns.length) {
    els.boardGrid.innerHTML = '<div class="board-empty">No notes have a frontmatter property to group by.</div>';
    return;
  }
  for (const col of data.columns) {
    const colEl = document.createElement('div');
    colEl.className = 'board-col';
    colEl.dataset.value = col.value;
    const head = document.createElement('div');
    head.className = 'board-col-head';
    head.innerHTML = '<span>' + escapeHtml(col.value) + '</span><span class="board-col-count">' + col.count + '</span>';
    colEl.appendChild(head);
    const body = document.createElement('div');
    body.className = 'board-col-body';
    for (const card of col.cards) {
      const cardEl = document.createElement('div');
      cardEl.className = 'board-card' + (card.pinned ? ' pinned' : '');
      cardEl.draggable = true;
      cardEl.dataset.id = card.id;
      cardEl.innerHTML = '<div class="board-card-title">' + (card.pinned ? '★ ' : '') + escapeHtml(card.title) + '</div>'
        + '<div class="board-card-preview">' + escapeHtml((card.preview || '').replace(/\n/g, ' ').slice(0, 80)) + '</div>';
      cardEl.addEventListener('click', () => { closeSettings(); openNote(card.id); });
      cardEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/x-mycelium-card-id', card.id);
        cardEl.classList.add('dragging');
      });
      cardEl.addEventListener('dragend', () => cardEl.classList.remove('dragging'));
      body.appendChild(cardEl);
    }
    colEl.appendChild(body);
    colEl.addEventListener('dragover', (e) => {
      if (e.dataTransfer.types.includes('text/x-mycelium-card-id')) {
        e.preventDefault();
        colEl.classList.add('drop-target');
      }
    });
    colEl.addEventListener('dragleave', () => colEl.classList.remove('drop-target'));
    colEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      colEl.classList.remove('drop-target');
      const cardId = e.dataTransfer.getData('text/x-mycelium-card-id');
      if (!cardId) return;
      const newValue = col.value === '(none)' ? null : col.value;
      try {
        await invoke('set_property', { id: cardId, key, value: newValue });
        await refreshBoard();
        if (state.activeId === cardId) await openNote(cardId);
        await loadNotes();
      } catch (e2) { alert('Failed: ' + e2); }
    });
    els.boardGrid.appendChild(colEl);
  }
}
function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
// v0.28 — only allow simple CSS color forms to avoid injection.
function isSafeCssColor(s) {
  if (!s) return false;
  s = String(s).trim();
  if (s.length > 32) return false;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return true;
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return true;
  if (/^#[0-9a-fA-F]{8}$/.test(s)) return true;
  if (/^[a-zA-Z]{3,20}$/.test(s)) return true; // named CSS colors
  if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(s)) return true;
  if (/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/.test(s)) return true;
  return false;
}
if (els.boardRefreshBtn) els.boardRefreshBtn.addEventListener('click', () => {
  state.settings.board_property = (els.boardPropertyInput.value || 'status').trim();
  invoke('set_settings', { settings: state.settings }).catch(()=>{});
  refreshBoard();
});
if (els.boardPropertyInput) els.boardPropertyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); els.boardRefreshBtn.click(); }
});

// --- v0.19 — month calendar -----------------------------------------
state.calCursor = null; // { year, month }
function calCursorOrNow() {
  if (state.calCursor) return state.calCursor;
  const d = new Date();
  state.calCursor = { year: d.getFullYear(), month: d.getMonth() + 1 };
  return state.calCursor;
}
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
async function refreshCalendar() {
  if (!els.calGrid) return;
  const cur = calCursorOrNow();
  const key = (els.calPropertyInput && els.calPropertyInput.value.trim()) || (state.settings.calendar_property || 'due');
  if (els.calPropertyInput && !els.calPropertyInput.value) els.calPropertyInput.value = key;
  if (els.calLabel) els.calLabel.textContent = `${MONTHS[cur.month - 1]} ${cur.year}`;
  let data;
  try { data = await invoke('month_calendar', { year: cur.year, month: cur.month, key }); }
  catch (e) { els.calGrid.innerHTML = '<div class="cal-empty">' + e + '</div>'; return; }
  // Build a 6-row x 7-col grid starting on Monday for the month.
  const firstDay = new Date(Date.UTC(cur.year, cur.month - 1, 1));
  const startDow = (firstDow(firstDay) + 6) % 7; // Monday = 0
  const lastDate = new Date(Date.UTC(cur.year, cur.month, 0)).getUTCDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  els.calGrid.innerHTML = '';
  // Headers
  const head = document.createElement('div'); head.className = 'cal-head';
  for (const dn of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) {
    const c = document.createElement('div'); c.className = 'cal-dow'; c.textContent = dn; head.appendChild(c);
  }
  els.calGrid.appendChild(head);

  const grid = document.createElement('div'); grid.className = 'cal-cells';
  for (let pad = 0; pad < startDow; pad++) {
    const c = document.createElement('div'); c.className = 'cal-cell empty'; grid.appendChild(c);
  }
  for (let day = 1; day <= lastDate; day++) {
    const dayStr = `${cur.year.toString().padStart(4, '0')}-${cur.month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (dayStr === todayStr ? ' today' : '');
    const head = document.createElement('div'); head.className = 'cal-day'; head.textContent = String(day);
    cell.appendChild(head);
    const items = (data.by_day && data.by_day[dayStr]) || [];
    if (items.length) {
      const list = document.createElement('div'); list.className = 'cal-items';
      for (const it of items.slice(0, 4)) {
        const a = document.createElement('a'); a.href = '#'; a.className = 'cal-item' + (it.pinned ? ' pinned' : '');
        a.textContent = it.title;
        a.addEventListener('click', (e) => { e.preventDefault(); closeSettings(); openNote(it.id); });
        list.appendChild(a);
      }
      if (items.length > 4) {
        const more = document.createElement('div'); more.className = 'cal-more';
        more.textContent = '+' + (items.length - 4) + ' more';
        list.appendChild(more);
      }
      cell.appendChild(list);
    } else {
      cell.addEventListener('click', () => filterByProperty(key, dayStr));
      cell.style.cursor = 'pointer';
      cell.title = `Filter by ${key} = ${dayStr}`;
    }
    grid.appendChild(cell);
  }
  els.calGrid.appendChild(grid);
}
function firstDow(d) { return d.getUTCDay(); } // 0 = Sun
function calStep(delta) {
  const cur = calCursorOrNow();
  let m = cur.month + delta;
  let y = cur.year;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  state.calCursor = { year: y, month: m };
  refreshCalendar();
}
if (els.calPrevBtn) els.calPrevBtn.addEventListener('click', () => calStep(-1));
if (els.calNextBtn) els.calNextBtn.addEventListener('click', () => calStep(1));
if (els.calTodayBtn) els.calTodayBtn.addEventListener('click', () => { state.calCursor = null; refreshCalendar(); });
if (els.calPropertyInput) els.calPropertyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    state.settings.calendar_property = (els.calPropertyInput.value || 'due').trim();
    invoke('set_settings', { settings: state.settings }).catch(()=>{});
    refreshCalendar();
  }
});

(async () => {
  if (!T) { document.body.innerHTML = '<div style="padding:32px;color:#e6e6e6;background:#0e0f12;font-family:sans-serif">Tauri runtime not available. Please re-install.</div>'; return; }
  loadRecents();
  loadTabs();
  await loadSettings();
  await loadThemes();
  applyTheme(state.settings.theme || 'dark');
  await loadPlugins();
  try { const info = await invoke('app_info'); els.version.textContent = 'v' + info.version; els.aboutVersion.textContent = 'v' + info.version; } catch (e) {}
  await refreshLockUi();
  if (!state.locked) {
    await purgeEligibleTrash(); // v0.34 — auto-purge on launch
    await loadTemplates();
    await loadSnippets();
    await loadNotes();
  }
  showView('empty');
  setStatus('ready');
  if (state.settings.auto_check_updates) setTimeout(() => checkForUpdates(true), 2500);
  // v0.56 — backup reminder shown 4s after the update check so it doesn't get clobbered.
  setTimeout(maybeShowBackupReminder, 4000);
})();
