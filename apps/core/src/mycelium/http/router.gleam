import gleam/bit_array
import gleam/bytes_tree
import gleam/dynamic/decode
import gleam/erlang/process.{type Subject}
import gleam/http.{Get, Patch, Post}
import gleam/http/request.{type Request}
import gleam/http/response.{type Response}
import gleam/json
import gleam/option.{type Option, None, Some}
import gleam/otp/actor
import gleam/otp/static_supervisor as sup
import gleam/result
import gleam/string
import mist.{type Connection, type ResponseData}

import mycelium/config_server.{type Config}
import mycelium/document/block
import mycelium/http/editor_ws
import mycelium/registry.{type Names}
import mycelium/storage/surreal_port
import mycelium/util/ulid

pub fn start_link(
  config: Config,
  names: Names,
  port_subject: Subject(Int),
) -> Result(actor.Started(sup.Supervisor), actor.StartError) {
  let handler = make_handler(names)
  mist.new(handler)
  |> mist.bind("127.0.0.1")
  |> mist.port(config_server.http_port(config))
  |> mist.after_start(fn(port, _, _) { process.send(port_subject, port) })
  |> mist.start
}

fn make_handler(
  names: Names,
) -> fn(Request(Connection)) -> Response(ResponseData) {
  fn(req: Request(Connection)) -> Response(ResponseData) {
    case req.method, request.path_segments(req) {
      Get, [] -> serve_shell()
      Get, ["assets", "app.css"] -> css_response()
      Get, ["assets", "app.js"] -> js_response()
      Get, ["ws", "editor", doc_id] -> editor_ws.upgrade(req, doc_id, names)
      Get, ["api", "notes"] -> list_notes(names)
      Post, ["api", "notes"] -> create_note(names)
      Get, ["api", "notes", id] -> get_note(names, id)
      Patch, ["api", "notes", id] -> update_note_handler(req, names, id)
      Get, ["api", "search", q] -> search_handler(names, q)
      Post, ["api", "pairing", "begin"] -> pairing_begin_handler(req, names)
      Post, ["api", "pairing", "finish"] -> pairing_finish_handler(req, names)
      Get, ["api", "ring", "info"] -> ring_info_handler(names)
      _, _ -> not_found()
    }
  }
}

fn serve_shell() -> Response(ResponseData) {
  let html =
    "<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />
    <title>Mycelium</title>
    <link rel=\"stylesheet\" href=\"/assets/app.css\" />
  </head>
  <body>
    <a class=\"skip-link\" href=\"#editor-area\">Skip to editor</a>
    <main id=\"app\" role=\"application\" aria-label=\"Mycelium workspace\">
      <aside class=\"sidebar\" role=\"complementary\" aria-label=\"Notes navigation\">
        <h1>Mycelium</h1>
        <label class=\"sr-only\" for=\"search-bar\">Search notes</label>
        <input id=\"search-bar\" type=\"search\" placeholder=\"Search... (press / to focus)\" autocomplete=\"off\" aria-label=\"Search notes\" />
        <div class=\"sidebar-controls\" role=\"toolbar\" aria-label=\"Sidebar actions\">
          <button id=\"new-note\" aria-keyshortcuts=\"Control+N\">+ New Note</button>
          <button id=\"toggle-pairing\" title=\"Pair a device\" aria-label=\"Pair a device\">+</button>
          <button id=\"toggle-theme\" title=\"Toggle theme\" aria-label=\"Cycle theme\">◐</button>
        </div>
        <ul id=\"notes\" role=\"list\" aria-label=\"Notes list\"></ul>
      </aside>
      <section class=\"editor\" role=\"region\" aria-label=\"Editor\">
        <div id=\"editor-area\" contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" aria-label=\"Note content\" tabindex=\"0\"></div>
      </section>
    </main>
    <div id=\"pairing-modal\" class=\"modal-backdrop\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"pair-title\" aria-hidden=\"true\">
      <div class=\"modal\">
        <h2 id=\"pair-title\">Pair a device</h2>
        <label for=\"pair-passphrase\">Pairing passphrase (share both ends)</label>
        <input id=\"pair-passphrase\" type=\"text\" autocomplete=\"off\" />
        <label for=\"pair-role\">Role</label>
        <select id=\"pair-role\">
          <option value=\"a\">Inviter (this device shares the passphrase)</option>
          <option value=\"b\">Joiner (this device receives the passphrase)</option>
        </select>
        <div class=\"modal-actions\">
          <button id=\"pair-cancel\">Cancel</button>
          <button id=\"pair-begin\" class=\"primary\">Begin pairing</button>
        </div>
        <div id=\"pair-result\" role=\"status\" aria-live=\"polite\" style=\"margin-top: 1rem; font-size: 0.85rem; color: var(--fg3); white-space: pre-wrap; word-break: break-all;\"></div>
      </div>
    </div>
    <script src=\"/assets/app.js\"></script>
  </body>
</html>"
  response.new(200)
  |> response.set_header("content-type", "text/html; charset=utf-8")
  |> response.set_body(mist.Bytes(bytes_tree.from_string(html)))
}

fn css_response() -> Response(ResponseData) {
  let css =
    ":root { --bg: #1a1a1a; --bg2: #111; --bg3: #2a2a2a; --bg4: #333; --fg: #e8e8e8; --fg2: #ccc; --fg3: #888; --border: #333; --accent: #5fb3ff; --placeholder: #555; }
body[data-theme=\"light\"] { --bg: #fafafa; --bg2: #fff; --bg3: #f0f0f0; --bg4: #e0e0e0; --fg: #1a1a1a; --fg2: #333; --fg3: #666; --border: #ddd; --accent: #0064d9; --placeholder: #999; }
body[data-theme=\"high-contrast\"] { --bg: #000; --bg2: #000; --bg3: #1a1a1a; --bg4: #333; --fg: #fff; --fg2: #fff; --fg3: #ddd; --border: #fff; --accent: #ffeb3b; --placeholder: #999; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; height: 100vh; overflow: hidden; background: var(--bg); color: var(--fg); }
#app { display: flex; height: 100vh; }
.sidebar { width: 260px; background: var(--bg2); border-right: 1px solid var(--border); padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.sidebar h1 { font-size: 1rem; color: var(--fg3); letter-spacing: 0.1em; text-transform: uppercase; }
.sidebar-controls { display: flex; gap: 0.25rem; }
#new-note, #toggle-theme, #toggle-pairing { padding: 0.5rem; background: var(--bg3); color: var(--fg); border: 1px solid var(--bg4); border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
#new-note { flex: 1; }
#toggle-theme, #toggle-pairing { padding: 0.4rem 0.6rem; }
#new-note:hover, #toggle-theme:hover, #toggle-pairing:hover { background: var(--bg4); }
#search-bar { width: 100%; padding: 0.5rem; background: var(--bg3); color: var(--fg); border: 1px solid var(--bg4); border-radius: 4px; font-size: 0.85rem; }
#notes { list-style: none; flex: 1; overflow-y: auto; }
#notes li { padding: 0.5rem; cursor: pointer; border-radius: 4px; margin-bottom: 2px; font-size: 0.9rem; color: var(--fg2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#notes li:hover { background: var(--bg2); filter: brightness(1.15); }
#notes li.open { background: var(--bg3); color: var(--fg); border-left: 3px solid var(--accent); padding-left: calc(0.5rem - 3px); }
.editor { flex: 1; padding: 2rem 4rem; overflow-y: auto; }
#editor-area { outline: none; min-height: 100%; font-size: 1.05rem; line-height: 1.6; max-width: 720px; margin: 0 auto; }
#editor-area:empty::before { content: 'Start writing...'; color: var(--placeholder); }
#editor-area p, #editor-area h1, #editor-area h2, #editor-area h3, #editor-area h4 { margin: 0.5em 0; }
#editor-area h1 { font-size: 2em; font-weight: 600; }
#editor-area h2 { font-size: 1.5em; font-weight: 600; }
#editor-area h3 { font-size: 1.25em; font-weight: 600; }
#editor-area h4 { font-size: 1.1em; font-weight: 600; }
#editor-area ul { padding-left: 1.5em; margin: 0.5em 0; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 100; }
.modal-backdrop.open { display: flex; }
.modal { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 2rem; min-width: 360px; max-width: 600px; }
.modal h2 { margin-bottom: 1rem; color: var(--fg); }
.modal label { display: block; margin: 0.5rem 0 0.25rem; color: var(--fg2); font-size: 0.85rem; }
.modal input, .modal select { width: 100%; padding: 0.5rem; background: var(--bg3); color: var(--fg); border: 1px solid var(--bg4); border-radius: 4px; }
.modal-actions { display: flex; gap: 0.5rem; margin-top: 1rem; justify-content: flex-end; }
.modal button { padding: 0.5rem 1rem; background: var(--bg3); color: var(--fg); border: 1px solid var(--bg4); border-radius: 4px; cursor: pointer; }
.modal button.primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.skip-link { position: absolute; left: -9999px; top: 0; background: var(--accent); color: var(--bg); padding: 0.5rem 1rem; z-index: 200; text-decoration: none; font-weight: 600; }
.skip-link:focus { left: 1rem; top: 1rem; outline: 2px solid var(--fg); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
button:focus-visible, input:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
"
  response.new(200)
  |> response.set_header("content-type", "text/css")
  |> response.set_body(mist.Bytes(bytes_tree.from_string(css)))
}

fn js_response() -> Response(ResponseData) {
  let js =
    "const $ = (id) => document.getElementById(id);
let currentId = null;
let saveTimer = null;
let searchTimer = null;

const themes = ['dark', 'light', 'high-contrast'];
function loadTheme() {
  const t = localStorage.getItem('mycelium-theme') || 'dark';
  document.body.dataset.theme = t;
}
function cycleTheme() {
  const cur = document.body.dataset.theme || 'dark';
  const next = themes[(themes.indexOf(cur) + 1) % themes.length];
  document.body.dataset.theme = next;
  localStorage.setItem('mycelium-theme', next);
}

async function refresh() {
  const r = await fetch('/api/notes');
  const d = await r.json();
  const ul = $('notes');
  ul.innerHTML = '';
  const items = (d && d.result && d.result.items) || [];
  for (const n of items) {
    const li = document.createElement('li');
    li.textContent = n.title || 'Untitled';
    li.dataset.id = n.id;
    if (n.id === currentId) li.classList.add('open');
    li.onclick = () => openNote(n.id);
    ul.appendChild(li);
  }
}

async function search(q) {
  if (!q) return refresh();
  const r = await fetch('/api/search/' + encodeURIComponent(q));
  const d = await r.json();
  const ul = $('notes');
  ul.innerHTML = '';
  const items = (d && d.result && d.result.items) || [];
  for (const n of items) {
    const li = document.createElement('li');
    li.textContent = n.title || 'Untitled';
    li.dataset.id = n.id;
    if (n.id === currentId) li.classList.add('open');
    li.onclick = () => openNote(n.id);
    ul.appendChild(li);
  }
}

function openPairingModal() { $('pairing-modal').classList.add('open'); }
function closePairingModal() { $('pairing-modal').classList.remove('open'); }

async function beginPairing() {
  const pp = $('pair-passphrase').value.trim();
  const role = $('pair-role').value;
  if (!pp) { $('pair-result').textContent = 'Passphrase required.'; return; }
  $('pair-result').textContent = 'Starting SPAKE2 ' + role + '...';
  try {
    const r = await fetch('/api/pairing/begin', {
      method: 'POST', headers: {'content-type':'application/json'},
      body: JSON.stringify({ passphrase: pp, role }),
    });
    const d = await r.json();
    $('pair-result').textContent = 'Session: ' + JSON.stringify(d, null, 2);
  } catch (e) { $('pair-result').textContent = 'Error: ' + e; }
}

async function openNote(id) {
  currentId = id;
  const r = await fetch('/api/notes/' + encodeURIComponent(id));
  const d = await r.json();
  const node = d && d.result;
  const ed = $('editor-area');
  ed.innerHTML = '';
  if (node && Array.isArray(node.body)) {
    for (const b of node.body) {
      let tag = 'p';
      if (b.kind === 'heading') tag = 'h' + Math.min(4, Math.max(1, b.level || 1));
      else if (b.kind === 'bullet') tag = 'li';
      const el = document.createElement(tag);
      el.textContent = b.text || '';
      ed.appendChild(el);
    }
  }
  if (!ed.children.length) ed.appendChild(document.createElement('p'));
  refresh();
}

async function newNote() {
  const r = await fetch('/api/notes', { method: 'POST', headers: {'content-type':'application/json'}, body: '{}' });
  const d = await r.json();
  currentId = d.id;
  $('editor-area').innerHTML = '<p></p>';
  refresh();
  $('editor-area').focus();
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 500);
}

async function save() {
  if (!currentId) return;
  const ed = $('editor-area');
  const blocks = [];
  for (const node of ed.children) {
    const tag = node.tagName.toLowerCase();
    let kind = 'paragraph';
    let level = null;
    if (/^h[1-4]$/.test(tag)) { kind = 'heading'; level = parseInt(tag[1], 10); }
    else if (tag === 'li') { kind = 'bullet'; }
    const block = { id: 'b_' + Math.random().toString(36).slice(2,10), kind, text: node.textContent };
    if (level) block.level = level;
    blocks.push(block);
  }
  const title = blocks.length && blocks[0].text ? blocks[0].text.slice(0, 80) : '';
  await fetch('/api/notes/' + encodeURIComponent(currentId), {
    method: 'PATCH',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({ title, body: blocks }),
  });
  refresh();
}

loadTheme();
$('new-note').onclick = newNote;
$('toggle-theme').onclick = cycleTheme;
$('toggle-pairing').onclick = openPairingModal;
$('pair-cancel').onclick = closePairingModal;
$('pair-begin').onclick = beginPairing;
$('pairing-modal').addEventListener('click', (e) => { if (e.target.id === 'pairing-modal') closePairingModal(); });
$('search-bar').addEventListener('input', (e) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => search(e.target.value.trim()), 200);
});
$('editor-area').addEventListener('input', scheduleSave);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) { e.preventDefault(); newNote(); return; }
  if (e.key === '/' && document.activeElement !== $('search-bar') && document.activeElement !== $('editor-area')) {
    e.preventDefault(); $('search-bar').focus(); return;
  }
  if (e.key === 'Escape') {
    if ($('pairing-modal').classList.contains('open')) { closePairingModal(); return; }
    if (document.activeElement === $('search-bar')) { $('search-bar').value = ''; refresh(); $('editor-area').focus(); return; }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); cycleTheme(); return; }
});

refresh();
"
  response.new(200)
  |> response.set_header("content-type", "application/javascript")
  |> response.set_body(mist.Bytes(bytes_tree.from_string(js)))
}

fn list_notes(names: Names) -> Response(ResponseData) {
  case surreal_port.list_nodes(names.storage, 100, 0) {
    Ok(s) -> json_response(200, s)
    Error(_) -> json_response(500, "{\"error\":\"storage failed\"}")
  }
}

fn create_note(names: Names) -> Response(ResponseData) {
  let id = ulid.new()
  case surreal_port.create_node(names.storage, id, "note", "", []) {
    Ok(_) -> json_response(201, "{\"id\":\"" <> id <> "\",\"created\":true}")
    Error(_) -> json_response(500, "{\"error\":\"create failed\"}")
  }
}

fn get_note(names: Names, id: String) -> Response(ResponseData) {
  case surreal_port.get_node(names.storage, id) {
    Ok(s) -> json_response(200, s)
    Error(_) -> json_response(404, "{\"error\":\"not found\"}")
  }
}

fn update_note_handler(
  req: Request(Connection),
  names: Names,
  id: String,
) -> Response(ResponseData) {
  case read_body_bits(req) {
    Ok(body_bits) -> {
      let body_str = bit_array.to_string(body_bits) |> result.unwrap("")
      case parse_update(body_str) {
        Ok(#(title, blocks)) -> {
          case surreal_port.update_node(names.storage, id, title, blocks) {
            Ok(s) -> json_response(200, s)
            Error(_) -> json_response(500, "{\"error\":\"update failed\"}")
          }
        }
        Error(e) ->
          json_response(
            400,
            "{\"error\":\"" <> string.replace(e, "\"", "'") <> "\"}",
          )
      }
    }
    Error(_) -> json_response(400, "{\"error\":\"body read failed\"}")
  }
}

fn parse_update(body: String) -> Result(#(OptionString, OptionBlocks), String) {
  let decoder = {
    use title <- decode.optional_field(
      "title",
      None,
      decode.string |> decode.map(Some),
    )
    use blocks <- decode.optional_field(
      "body",
      None,
      block.list_decoder() |> decode.map(Some),
    )
    decode.success(#(title, blocks))
  }
  case json.parse(body, decoder) {
    Ok(t) -> Ok(t)
    Error(_) -> Error("invalid json")
  }
}

type OptionString =
  Option(String)

type OptionBlocks =
  Option(List(block.Block))

fn read_body_bits(
  req: Request(Connection),
) -> Result(BitArray, mist.ReadError) {
  mist.read_body(req, 8 * 1024 * 1024)
  |> result.map(fn(r) { r.body })
}

fn json_response(status: Int, body: String) -> Response(ResponseData) {
  response.new(status)
  |> response.set_header("content-type", "application/json")
  |> response.set_body(mist.Bytes(bytes_tree.from_string(body)))
}

fn not_found() -> Response(ResponseData) {
  response.new(404)
  |> response.set_header("content-type", "text/plain")
  |> response.set_body(mist.Bytes(bytes_tree.from_string("Not Found")))
}

fn search_handler(names: Names, q: String) -> Response(ResponseData) {
  case surreal_port.search_nodes(names.storage, q, 50) {
    Ok(s) -> json_response(200, s)
    Error(_) -> json_response(500, "{\"error\":\"search failed\"}")
  }
}

fn pairing_begin_handler(
  req: Request(Connection),
  _names: Names,
) -> Response(ResponseData) {
  let _ = req
  json_response(
    200,
    "{\"session_id\":\"placeholder\",\"msg_b64\":\"\",\"note\":\"wire-up pending — pairing module is functional via direct Gleam API\"}",
  )
}

fn pairing_finish_handler(
  req: Request(Connection),
  _names: Names,
) -> Response(ResponseData) {
  let _ = req
  json_response(200, "{\"shared_key_b64\":\"placeholder\"}")
}

fn ring_info_handler(_names: Names) -> Response(ResponseData) {
  json_response(200, "{\"ring\":\"default\",\"members\":[]}")
}
