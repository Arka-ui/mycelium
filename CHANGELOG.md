# Mycelium v0.36.0-beta.1 - Bulk merge

beta.36 lets you fold many notes into one in a single click.

## New in v0.36.0

### Merge from selection
- Multi-select 2+ notes (Ctrl/Cmd-click in the sidebar) and the bulk action bar now shows a **⇉ Merge** button.
- The first-selected note becomes the **target**; the others are **sources**.
- Each source's body is appended to the target under a new `## Source Title` heading; sources move to trash; target's `updated_at` advances.
- Confirmation dialog shows the source count and target name before doing the work.

### Backend
- New `merge_notes(target_id, source_ids)` Tauri command. Refuses to include the target id in the source list.

### Auto-update
- Pushing v0.36.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.35.0-beta.1 - Sidebar keyboard navigation

beta.35 lets you navigate the workspace without leaving the keyboard.

## New in v0.35.0

### Arrow keys in the sidebar
- **↑** / **↓** move the highlight up and down through visible notes (respecting active tag/orphan filters and pinned-on-top order). Selected note opens immediately.
- **Home** / **End** jump to the first / last visible note.
- Active only when no input or textarea is focused.

### Enter / Delete / F2
- **Enter** moves focus into the editor body — start typing.
- **Delete** moves the current note to trash.
- **F2** prompts for a new title and renames the open note. Also available in the command palette as "Rename current note...".

### Auto-update
- Pushing v0.35.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.34.0-beta.1 - Trash retention

beta.34 graduates the Trash from "leaks forever" to a self-cleaning system.

## New in v0.34.0

### Auto-purge with configurable retention
- New **Settings → Data → Trash retention** dropdown: Never / 7 / 14 / 30 (default) / 60 / 90 / 180 / 365 days.
- On launch and on demand, trashed notes older than the threshold are deleted permanently.
- New status message reports how many notes were purged at boot.
- Backend: `auto_purge_trash(days)` Tauri command. Setting persisted as `trash_purge_days`.

### Trash count badge in sidebar
- The sidebar **Trash** tab shows a count chip when there are trashed notes (e.g. `Trash 5`).
- Updates after every load/refresh.
- Backend: `trash_count` command.

### Manual purge button
- "Purge eligible now" button next to the retention dropdown runs the same logic immediately and reports back.

### Auto-update
- Pushing v0.34.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.33.0-beta.1 - Editor power

beta.33 ships four editor moves that every IDE user expects to find on day one.

## New in v0.33.0

### Multi-line block indent
- Select multiple lines, press **Tab** → every line in the selection is indented by 2 spaces. **Shift + Tab** outdents.
- Single-line behavior unchanged (still smart for lists / non-lists).

### Toggle HTML comment
- **Ctrl + /** in the editor wraps the selection (or current line) in `<!-- … -->`. Press again to unwrap. Useful for stashing parts of a draft without deleting them.

### Delete current line
- **Ctrl + Shift + K** deletes the line(s) under the caret/selection without touching the clipboard.

### Duplicate current line
- **Ctrl + Shift + D** copies the line(s) under the caret/selection and inserts the copy directly below.

### Auto-update
- Pushing v0.33.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.32.0-beta.1 - Writing goals & scroll memory

beta.32 helps long-form writing in two ways: a frontmatter writing-goal chip in the editor footer, and per-note scroll position memory.

## New in v0.32.0

### Writing-goal chip
- Add `goal: 1000` (or `goal: 500 chars`, `goal: 5 min`) to a note's frontmatter and the editor footer shows a colored chip:

  > Goal: 312 / 1000 words (31%)
- Three units recognised: words (default), `chars`, `min` (read-time minutes).
- The chip turns accent-tinted when the goal is met.

### Per-note scroll position
- The editor remembers where you scrolled in each note. Switching to a long note and coming back puts you within a frame of where you left off.
- Stored in `localStorage` under `mycelium.scroll.v1` (debounced 200 ms while scrolling). Lives across restarts.

### Auto-update
- Pushing v0.32.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.31.0-beta.1 - Template variables

beta.31 makes templates dynamic: drop a `{{date}}` or `{{title}}` token in any template body and it gets substituted when you create the note. A `{{cursor}}` marker places the caret automatically.

## New in v0.31.0

### Tokens
- `{{date}}` — today as `YYYY-MM-DD`
- `{{time}}` — now as `HH:MM`
- `{{datetime}}` — current RFC 3339 timestamp
- `{{year}}` / `{{month}}` / `{{day}}` — individual components
- `{{title}}` — the title you just chose for the new note
- `{{cursor}}` — pass-through marker; the frontend removes it after open and places the caret at that position
- Unknown tokens (`{{not_real}}`) are left unchanged so existing templates with curly-brace literals don't break.

### Backend
- New helper `expand_template_vars(body, title)` runs in `note_from_template` before persisting. UTF-8 safe; matches by lowercased name; handles repeated tokens.

### "Duplicate as..." palette command
- New command prompts for a new title and creates a copy of the open note with that title, leaving body intact. Speeds up "use this note as a starting point for a new one with a different name".

### Auto-update
- Pushing v0.31.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.30.0-beta.1 - Search-everywhere modal

beta.30 graduates the sidebar search box: a centered modal with snippet previews and keyboard-driven results, opened from anywhere with Ctrl+Shift+F.

## New in v0.30.0

### Modal
- **Ctrl + Shift + F** (or palette → "Search every note...") opens a centered search modal pinned to the top 10% of the viewport.
- Live search across every note (title + body), 120 ms debounce.
- Each result shows the title (with ★ for pinned), the snippet around the match (highlighted), and a metadata line ("in body / in title · time ago").
- **↑ / ↓** navigate, **Enter** opens, **Esc** closes. Click also opens.
- Pre-fills with the current sidebar search query when opened (so you can elevate a sidebar search to the modal).

### Highlighting
- The matched substring inside each snippet is wrapped in `<mark>` with an accent-tinted background. Pure client-side, no extra backend round trip.

### Auto-update
- Pushing v0.30.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.29.0-beta.1 - Note tabs

beta.29 introduces an IDE-style tab bar above the editor. Open as many notes as you like in parallel, switch with Ctrl+Tab, close with Ctrl+W. Tabs persist across restarts.

## New in v0.29.0

### Tab bar
- A row above the editor lists every open note as a tab. Active tab is highlighted; inactive tabs dim.
- Click a tab → focus it. **× button** or **middle-click** → close it.
- Long titles are truncated with ellipsis. The tab row scrolls horizontally if you open many.
- Auto-hides when no tabs are open.

### Opening notes in tabs
- **Click** a sidebar entry → opens in the current tab (replacing it if active).
- **Alt + click** → opens the note in a new tab and focuses it.
- **Middle-click** → adds the note to the tab strip without changing focus (background tab).

### Keyboard shortcuts
- **Ctrl + Tab** — next tab (wraps).
- **Ctrl + Shift + Tab** — previous tab (wraps).
- **Ctrl + W** — close current tab. Falls back to the previous tab; if none, returns to the empty state.

### Persistence
- Open tab IDs persist in `localStorage` under `mycelium.tabs.v1` and are reloaded on the next launch.

### Auto-update
- Pushing v0.29.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.28.0-beta.1 - Visual note metadata

beta.28 lets notes carry a splash of identity in the sidebar via two new frontmatter properties: `color:` and `icon:`.

## New in v0.28.0

### Frontmatter `color:`
- Set `color: blue` (or `#7aa6ff`, or `rgb(122, 166, 255)`) in a note's frontmatter and the sidebar entry gains a 3 px colored bar on the left edge.
- Accepted values: hex (`#rgb`, `#rrggbb`, `#rrggbbaa`), CSS named colors, `rgb()` / `rgba()`. Anything else is silently ignored (no DOM injection).
- Length capped at 32 chars before validation.

### Frontmatter `icon:`
- Set `icon: 🚀` (or any emoji / 1–8 char glyph) and the sidebar title gains the icon as a prefix.
- Long strings are silently dropped to keep the title row legible.

### Backend
- `NoteSummary` now includes optional `color` and `icon` fields; populated by `summarize` from the parsed frontmatter.

### Auto-update
- Pushing v0.28.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.27.0-beta.1 - Encrypted backups

beta.27 lets you take an encrypted snapshot of the entire workspace — notes, themes, templates, plugins, settings — and stash it on a USB stick or in cloud storage without leaking the contents.

## New in v0.27.0

### Encrypted backup
- New **Settings → Data → "Encrypted backup..."** button (and palette command "Encrypted workspace backup...").
- Prompts for a passphrase (≥6 chars) twice, then downloads `mycelium-workspace-<stamp>.encrypted.json`.
- Cipher: ChaCha20-Poly1305 with a 12-byte random nonce, key derived via 50,000 BLAKE3 iterations from a fresh 16-byte salt + passphrase. Same primitives as the at-rest workspace lock.
- Envelope: `{ "format": "mycelium-workspace-enc-v1", "salt": "<hex>", "_enc1": "<base64-nonce-and-ciphertext>" }`.

### Restore auto-detects the format
- The existing **Restore from backup...** button now recognises encrypted bundles by their `format` field, prompts for the passphrase, decrypts in-process, and continues with the normal import flow.
- Plain (non-encrypted) bundles still work exactly as before.

### Honest disclaimer
- Lose the passphrase = lose the data. There is no recovery.
- Encryption is identical in primitives to the at-rest workspace lock, but is not yet covered by an external audit (planned with the rest of the cryptography in M4).

### Backend
- New `export_workspace_encrypted(passphrase)` and `decrypt_workspace_bundle(bundle, passphrase)` commands.

### Auto-update
- Pushing v0.27.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.26.0-beta.1 - Emoji & sharing

beta.26 makes notes more expressive in preview and easier to share outside the app.

## New in v0.26.0

### Markdown emoji shortcodes
- Type `:smile:` `:rocket:` `:fire:` (and ~120 more) in any note. Preview replaces them with the actual emoji.
- Curated dictionary; unknown shortcodes are passed through unchanged so `:not_an_emoji:` stays as text.
- Source remains plain Markdown — no `:emoji:` is rewritten in the .json file on disk.

### Copy current note as HTML
- New palette command "Copy current note as HTML" writes the rendered HTML (with any smart-typography substitutions applied) to the system clipboard. Paste into email, docs, GitHub, anywhere that accepts HTML.

### Save current note as standalone .html
- New palette command "Save current note as standalone .html" downloads the note as a single self-contained HTML file with inline styles. No external assets, opens in any browser.

### Auto-update
- Pushing v0.26.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.25.0-beta.1 - Text snippets

beta.25 ships a tiny snippet expansion engine: type `;name` followed by Tab in the editor body and the snippet at the caret expands. Six defaults ship; managing your own is a click away.

## New in v0.25.0

### Built-in shortcuts
- `;todo` → `- [ ] ` (task checkbox)
- `;today` → today's date as `YYYY-MM-DD`
- `;now` → current time as `HH:MM`
- `;hr` → newline + `---` + newline (horizontal rule)
- `;code` → empty fenced code block
- `;fm` → frontmatter scaffold (`status:` + `type:` between `---` markers)

### Settings → Snippets
- A new tab. Edit trigger / body / description per row, add or remove rows, **Save snippets** persists.
- **Reset to defaults** restores the bundled set.
- Trigger validation: alphanumeric / `-` / `_`. No duplicates.
- Persisted as `~/.local/share/Mycelium/snippets.json` (or platform equivalent).

### Backend
- New `Snippet { key, body, description? }` struct.
- `list_snippets()` returns either the saved list or the built-in defaults.
- `save_snippets(snippets)` validates and writes atomically.

### Auto-update
- Pushing v0.25.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.24.0-beta.1 - Sidebar polish

beta.24 makes the sidebar feel like a proper IDE panel: drag to resize, click to collapse, and the new state sticks across restarts.

## New in v0.24.0

### Drag-to-resize
- Hover the new 6px divider between the sidebar and the editor pane → it tints accent.
- Click and drag → the sidebar width updates live.
- Width is clamped to 180–640 px and persisted as `sidebar_width`.

### Collapse / show
- New « button in the sidebar header (and **Ctrl + \\**) hides the sidebar entirely. Editor pane expands to fill the window.
- A small ☰ button appears at the top-left when collapsed; clicking it (or **Ctrl + \\** again) brings the sidebar back.
- State persists as `sidebar_visible`.

### Auto-update
- Pushing v0.24.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.23.0-beta.1 - Rich backlinks

beta.23 turns the backlinks panel from a list of titles into a rich context view, and adds a Mentions section for notes that reference the current title in prose.

## New in v0.23.0

### Backlinks with context snippets
- Each backlink row now shows the line in the source note that contains `[[ThisTitle]]`, trimmed to 120 chars.
- Lines are italic / dimmed under the title for visual grouping.
- New backend: `backlinks_with_context(title)` (the simpler `backlinks(title)` still ships for back-compat).

### Mentions section
- Below Backlinks, a new **Mentions** section lists notes that contain the current note's title as plain text (case-insensitive) but NOT just as `[[wiki]]`. Useful for finding implicit references you forgot to wikify.
- Same snippet styling.
- New backend: `mentions(title)` — skips occurrences wrapped in `[[…]]`.

### Auto-update
- Pushing v0.23.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.22.0-beta.1 - Capture & share

beta.22 makes throwaway thoughts and finished notes both faster to move in and out of the workspace.

## New in v0.22.0

### Sidebar quick-capture box
- A persistent dashed input above the note list. Type a thought, press Enter, and it gets appended to today's daily note as `- [HH:MM] your text`. The daily note is created if absent.
- Toggleable in **Settings → General** ("Show the sidebar quick-capture box"). On by default.
- Backend: `quick_capture_append(text)` — atomic append, sets `updated_at`, creates the daily note shape if needed.

### Multi-file Markdown import
- New "Import multiple .md files..." button in **Settings → Data**. Picks an arbitrary number of files at once, imports each as a new note (first `# heading` becomes the title), reports a count.
- Also available from the command palette ("Import multiple Markdown files...").

### Copy current note as Markdown
- New 📋 toolbar button + palette command writes the current note's exported Markdown (with `# Title` and `> Updated:` header) to the system clipboard.

### Auto-update
- Pushing v0.22.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.21.0-beta.1 - Suggested notes

beta.21 surfaces hidden connections in the workspace by ranking notes "related to" the open one — without you having to wiki-link them yourself.

## New in v0.21.0

### Suggested panel
- New **Suggested** section under Outgoing in the Backlinks panel.
- Up to 6 related notes ranked by a combined similarity score:
  - **Shared tags** × 2 (a tag co-occurrence is the strongest signal)
  - **Shared frontmatter key+value** × 1
  - **Shared outgoing wiki-link targets** × 1
- Notes that don't share anything score 0 and are excluded.
- Click a suggestion to open it.

### Backend
- New `suggested_notes(id, limit?)` command. Computes scores in one pass over all non-trashed notes, returns top-N.
- All similarity computation happens locally — no embeddings, no network.

### Auto-update
- Pushing v0.21.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.20.0-beta.1 - Smarter wiki-links

beta.20 brings three Obsidian-style upgrades to the wiki-link grammar — note aliases, block references, and display text — backed by a new `resolve_link` command.

## New in v0.20.0

### Note aliases via frontmatter
- Add `alias: foo, bar` (or `aliases: foo, bar`) to a note's frontmatter to declare alternate names.
- `[[foo]]` and `[[bar]]` then both resolve to that note. Case-insensitive, comma-separated.
- Wiki-link autocomplete now also suggests aliases, with a `→ Real Title` hint to disambiguate.

### Block references
- `[[Note#Heading]]` resolves to the note and scrolls preview to the matching heading after open. Heading match is text-based, case-insensitive, prefix-matched.
- Combine: `[[Note#Heading|see here]]` works too.

### Display text
- `[[Real Title|click here]]` renders the link as `click here` while still pointing at "Real Title". Common Obsidian convention.

### Backend
- `resolve_link(target)` returns `{ id, title, anchor }` (anchor only if `#` was used). Falls back to alias lookup before declaring a link broken.
- `all_aliases()` returns every note that publishes one or more aliases (used by autocomplete).

### Auto-update
- Pushing v0.20.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.19.0-beta.1 - Calendar view

beta.19 closes the loop on frontmatter properties: deadlines, schedules, agendas now have a month-grid view that pins notes to dates.

## New in v0.19.0

### Month calendar
- New **Settings → Calendar** tab. Reads any frontmatter date property (default `due`).
- Month grid: 7 columns × up to 6 rows, Monday-first.
- Each note carrying `KEY: YYYY-MM-DD` (or longer ISO timestamp) appears pinned to that day with its title as a clickable chip.
- Today's cell is outlined with the accent color.
- Empty cells are clickable → filter the sidebar to all notes with `KEY = day`.

### Navigation
- **Prev** / **Today** / **Next** buttons traverse months. The "Today" button always returns to the current month.
- **Property** input lets you switch the watched key on the fly (default `due`); pressing Enter saves and refreshes.

### Backend
- New `month_calendar(year, month, key?)` command. Returns `{ year, month, property, by_day: { 'YYYY-MM-DD': [{id, title, pinned}, …] } }`.
- New `calendar_property` setting (default `"due"`).

### Auto-update
- Pushing v0.19.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.18.0-beta.1 - Inline queries

beta.18 ships a tiny query DSL that turns any note into a live dashboard.

## New in v0.18.0

### `!query:` syntax
- Drop a line of `!query: <expression>` (case-insensitive prefix) anywhere in a note. In preview, the line becomes a styled, clickable list of matching notes.
- Hydrated asynchronously after render; sorted by `updated_at` desc.

### Supported expressions
- `tag=NAME`        — notes that contain `#NAME`
- `KEY=VALUE`       — notes with frontmatter `KEY: VALUE` (case-insensitive on key + value)
- `KEY`             — notes that have any value for frontmatter `KEY`
- `orphan` / `orphans` — notes with zero in/out wiki-links
- `pinned`          — pinned notes
- `untitled`        — notes whose title is empty

### Backend
- New `query_notes(query)` command. Internally reuses the existing helpers (`extract_tags`, `parse_frontmatter`, `orphan_notes`).

### Auto-update
- Pushing v0.18.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.17.0-beta.1 - Kanban board

beta.17 turns the brand-new frontmatter properties into a workflow surface: a Settings → Board tab groups every note by any property and lets you drag cards between columns to rewrite the underlying note's frontmatter automatically.

## New in v0.17.0

### Kanban board
- **Settings → Board** tab. Choose a property (default: `status`), get one column per distinct value plus an `(none)` column for notes that lack the property.
- Each card shows the note title, a 80-char preview, and a star marker for pinned notes.
- **Click a card** opens the note (settings modal closes).
- **Drag a card** between columns → backend rewrites the source note's `key:` frontmatter to the new column value. Dropping into `(none)` removes the property entirely.
- Configurable property persists in settings (`board_property`, default `"status"`).

### Backend
- `set_property(id, key, value?)` rewrites or removes one frontmatter property; creates the `---` block if missing.
- `board_data(key)` returns columns with cards.

### Auto-update
- Pushing v0.17.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.16.0-beta.1 - Note properties

beta.16 introduces lightweight YAML-ish frontmatter on every note. Drop a `--- key: value ---` block at the top, get a clickable properties strip below the title, and filter the whole workspace by any key/value combination.

## New in v0.16.0

### Frontmatter parsing
- A note that begins with a `---`-fenced block is parsed for `key: value` lines. Example:

  ```
  ---
  status: doing
  type: project
  due: 2026-06-01
  ---

  # Real note content starts here
  ```
- The block is hidden in preview (the rendered HTML starts at "Real note content").
- Pure dependency-free Rust parser — supports `key: value` lines only. Anything more complex (nested maps, arrays, multi-line) is treated as opaque text.

### Properties strip below title
- Parsed key/value pairs render as colored chips between the title and the body.
- **Click any chip** to filter the sidebar to all notes carrying that exact `key = value`.

### Filter notes by property
- Command palette → "Filter notes by property..." → pick a key, optionally a value, and the sidebar shows the matching set.
- New backend commands: `note_properties(id)`, `notes_by_property(key, value?)`, `all_property_keys()`.

### Auto-update
- Pushing v0.16.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.15.0-beta.1 - Link & graph intelligence

beta.15 makes the wiki-link graph a first-class citizen: see what's connected, what's broken, what's stranded, and rename a tag once to fix it everywhere.

## New in v0.15.0

### Orphans sidebar view
- New "Orphans" tab in the sidebar nav, between **All notes** and **Trash**.
- Lists every non-trashed note with **zero incoming and zero outgoing wiki-links** — your stranded notes that nothing connects to.
- New backend command: `orphan_notes`.

### Outgoing links panel
- The Backlinks panel now also shows **Outgoing links** — every distinct `[[Title]]` referenced by the current note.
- Each row links straight to the target (or, if the target doesn't exist, creates it on click and shows a `missing` badge).
- New backend command: `outgoing_links(id)`.

### Broken `[[wiki-link]]` highlighting
- Wiki-links in preview that don't resolve to a note now render with a wavy red underline and a tooltip — clicking offers to create the missing note.
- Outgoing-link rows for missing targets are similarly tagged.

### Rename tag everywhere
- **Right-click any tag chip** in the tag bar → "Rename tag (#x → ...)" → enter the new name. The backend rewrites every non-trashed note's body to swap `#oldtag` → `#newtag` and reports how many notes were touched.
- Tag-name validation: alphanumeric + `-` + `_`. Case-folded match.
- New backend command: `rename_tag(old_tag, new_tag) -> u32`.

### Auto-update
- Pushing v0.15.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.14.0-beta.1 - Writing comfort

beta.14 dials the editor in for long sessions: readable font size, word wrap toggle, smart typography in preview, move-line shortcut, and one-click print to PDF.

## New in v0.14.0

### Adjustable editor font size
- New `editor_font_size` setting (default 15 px). Pick from 12 / 13 / 14 / 15 / 16 / 17 / 18 / 20 in **Settings → General**.
- **Ctrl + =** / **Ctrl + +** : increase by 1 px
- **Ctrl + -** : decrease by 1 px
- **Ctrl + 0** : reset to default
- All shortcuts available from the command palette as well.

### Word wrap toggle
- New `word_wrap` setting (default on). When off, long lines scroll horizontally instead of wrapping. Useful for tables, ASCII art, and long URL inspection.

### Smart typography in preview
- New `smart_typography` setting (default off). When on, the preview replaces `--` → `—`, `...` → `…`, straight quotes → typographic quotes (`"foo"` → `"foo"`, `'bar'` → `'bar'`).
- Source text is unchanged — only the rendered preview transforms. Code blocks are skipped.

### Move line up / down
- **Alt + ↑** / **Alt + ↓** in the editor moves the current line (or the line containing the selection) up or down by one. Selection follows.

### Print / save as PDF
- New 🖨 toolbar button + **Ctrl + P** prints the current note's preview using the OS print dialog. The print stylesheet hides every chrome element and renders body / headings / lists / code in print-friendly black on white.

### Auto-update
- Pushing v0.14.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.13.0-beta.1 - Editor smarts

beta.13 fixes the silent papercuts that pile up in any Markdown editor: starting a new bullet on Enter, indenting a line with Tab, and turning pasted URLs into proper links when you have text selected.

## New in v0.13.0

### Smart list continuation
- **Enter** on a `- bullet`, `* bullet`, `+ bullet`, or `1. numbered` line opens a new list item one level down. Numbered lists auto-increment.
- **Enter** on an empty list item exits the list (deletes the marker, leaves the cursor on a blank line).
- Task lists (`- [ ] task`) continue with a fresh `- [ ] ` prefix.
- Toggleable in **Settings → General** ("Smart list continuation & indent"). On by default.

### Smart Tab / Shift+Tab
- **Tab** on a list line indents it by 2 spaces. **Shift+Tab** outdents.
- **Tab** on a non-list line inserts 2 spaces (rather than moving focus).

### Auto-indent
- New lines preserve the leading whitespace of the previous line, so code-style indentation sticks.

### Smart paste-link
- Select some text, paste a URL (`https://…` / `http://…`) → the selection is wrapped as `[selection](url)`. Falls back to the OS default paste otherwise. Shares the auto-pair toggle.

### Strip trailing whitespace on save
- Optional setting (off by default). When on, every trailing space / tab on every line is removed before persisting. Cursor position is preserved.

### Auto-update
- Pushing v0.13.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.12.0-beta.1 - Reading & navigation

beta.12 makes long notes navigable and pleasant to read. Switch to a sidebar-free reading mode, drop a `:::toc:::` block to inject a table of contents, jump back to whatever you opened recently from the palette, or hop to a random note for a spaced-review session.

## New in v0.12.0

### Reading mode (zen)
- **Ctrl + Shift + M** — or click the new 📖 toolbar button — toggles a distraction-free layout: sidebar gone, toolbar gone, find/outline/backlinks gone. The preview is centered with comfortable line-length and 16 px / 1.7 line-height.
- Forces preview on while reading. **Esc** also exits.

### Inline `:::toc:::`
- Drop a line containing only `:::toc:::` into any note. In preview, that line becomes a styled, indented Contents block — every heading in the note becomes a clickable link.
- Clicking a TOC item scrolls preview to the heading and moves the source-textarea cursor to the corresponding line.

### Recently opened in command palette
- Open the palette (Ctrl + K) with no query — the 10 most-recently-opened notes appear with a ⏱ marker, ranked above plain note matches.
- Recents persist across restarts via `localStorage` (key `mycelium.recents.v1`).

### Open random note
- **Ctrl + R** (or "Open random note" in the palette) jumps to a randomly-picked note from the workspace, never repeating the currently-open one. Great for spaced-review of older notes.

### Auto-update
- Pushing v0.12.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.11.0-beta.1 - Editor power-up

beta.11 turns the editor itself into a fast, friendly writing surface: link without thinking, fold a long doc to scan, copy a code block in one click, and let the editor close your brackets for you.

## New in v0.11.0

### Wiki-link autocomplete
- Type `[[` in the editor body and a popover appears with up to 8 matching note titles, ranked by substring match.
- **Arrow keys** navigate, **Enter / Tab** inserts `[[Title]]`, **Esc** closes.
- The query updates as you keep typing; click outside to dismiss.

### Foldable headings in preview
- Every rendered heading (`#` … `######`) gets a small `▾` toggle. Click to collapse the section beneath it (everything until the next equal-or-higher-level heading).
- Per-note state lives in client memory; switching notes resets folds.
- No source-text changes — only the rendered preview folds.

### One-click code block copy
- Every fenced code block in preview gets a corner **⧉ Copy** button (visible on hover).
- Uses `navigator.clipboard.writeText`; the button confirms with **✓** for ~1.2 s after a successful copy.
- Falls back to `document.getSelection()` over the `<pre>` if the clipboard API is unavailable.

### Auto-pair brackets and quotes
- Toggleable in **Settings → General**. On by default.
- Typing `(`, `[`, `{`, `"`, `'`, or `` ` `` inserts the closing pair and places the caret between them.
- With a selection active, the pair surrounds the selection instead.
- New `auto_pair` setting (defaults to `true`).

### Auto-update
- Pushing v0.11.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.10.0-beta.1 - Quality of life

beta.10 sands down four rough edges that the steady-state user hits every day: pinned notes have no manual order, bulk operations require touching one note at a time, finding-and-replacing inside a note isn't a thing, and every string in the app is hardcoded English. This release fixes all four.

## New in v0.10.0

### Drag-reorder pinned notes
- Pinned notes now carry a `display_order` field. Drag any pinned `<li>` to reorder; the new order persists across restarts.
- Unpinned notes still sort by the chosen sort key (Updated / Created / Title).
- New backend commands: `set_note_order(id, order)`, `reorder_pinned(ids[])`.

### Multi-select for bulk actions
- **Ctrl/Cmd + click** a sidebar note: toggle it in the selection (does not open).
- **Shift + click**: select range from the last clicked anchor to the current note.
- When at least one note is selected, a bulk-action bar appears above the list: **Pin all**, **Unpin all**, **Move to trash**, **Export selected**, **Clear**.
- Selection clears on view change or after a bulk action.
- New backend commands: `bulk_set_pinned(ids[], pinned)`, `bulk_trash(ids[])`, `bulk_export_md(ids[])`.

### Find and replace
- **Ctrl + H** in the editor opens a slim Find / Replace bar above the body textarea.
- **Find** highlights the next match (selects it in the textarea).
- **Replace** swaps the current match and advances. **Replace all** swaps every match in the body.
- **Esc** or the **Done** button closes the bar.
- Pure client-side; no Rust round-trip per match.

### Locale + i18n stub
- New `locale` setting (default `"en"`) selectable in **Settings → General**.
- A `t(key, fallback)` function in app.js looks up strings from `window.MYCELIUM_TRANSLATIONS[locale]`. The translation table is initially empty and ships only the English fallbacks inline; community contributors can drop a `translations.json` into the data folder to override.
- The current build contains the wiring; full string coverage will land progressively in v0.11+ as locales arrive.

### Auto-update
- Pushing v0.10.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.9.0-beta.1 - Visualization

beta.9 adds a Dashboard tab with at-a-glance stats, top tags, an activity heatmap, and an interactive note graph. Everything is computed locally, no third-party charting library.

## New in v0.9.0

### Dashboard tab in Settings
- **At-a-glance** cards: total notes, total words, total characters, pinned count, wiki-link count, distinct-tag count.
- **Top tags** list (top 10 by note-count) with one-click filter — clicking "Filter" closes Settings and applies the tag filter to the sidebar.
- **12-week activity heatmap** — a GitHub-style grid where each cell is one day, intensity scales with the number of notes touched that day.
- **Note graph** — a Canvas-based force-directed render of every note connected by `[[wiki-link]]`. Nodes scale by note size, pinned nodes are accent-coloured. Click a node to open the note.

### Backend
- 3 new commands: `graph_data`, `calendar_data`, `dashboard_stats`.
- A small in-house `WikiLinkFinder` (no `regex` crate) walks note bodies for `[[link]]` syntax.

### Frontend
- ~150 LOC of vanilla-JS dashboard rendering. Force-directed layout runs 250 iterations on tab open, then renders. No external charting library.
- Theme-aware colors (uses CSS custom properties via `getComputedStyle`).

### Auto-update
- Pushing v0.9.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.8.0-beta.1 - At-rest encryption

beta.8 turns the workspace lock from a UI guard into real cryptographic protection. When the lock is enabled, every note JSON file on disk is encrypted with ChaCha20-Poly1305; the master key is derived from your passphrase via 50,000 BLAKE3 iterations and never persisted.

## New in v0.8.0

### Encryption
- **At-rest encryption** of every note when the workspace lock is enabled. Files on disk look like `{"_enc1": "<base64-nonce-and-ciphertext>"}` instead of the raw JSON note.
- **Cipher**: ChaCha20-Poly1305 AEAD with a fresh 12-byte nonce per write (`OsRng`).
- **Key derivation**: `BLAKE3("mycelium-master-key-v1" || salt || passphrase)` iterated 50,000 times → 32-byte master key. Salt is the same 16-byte value already stored for the lock verifier.
- **Migration**: enabling the lock with existing plaintext notes encrypts them all in place. Disabling decrypts them all. Changing passphrase decrypts with the old key, then re-encrypts with the new.
- **Lock now** wipes the in-memory master key. Notes on disk remain encrypted; reads fail until next unlock.

### Crypto
- New deps: `chacha20poly1305 = "0.10"`, `base64 = "0.22"`.
- All file IO inside `Store` goes through `read_file_bytes` / `write_file_bytes` helpers that auto-encrypt/decrypt when a key is set.

### Honest disclaimer
- **Without the lock enabled, notes remain plaintext.** Encryption only kicks in once you enable the workspace lock and only protects the on-disk files (RAM still holds plaintext while the app runs).
- **Lose the passphrase = lose the data.** There is no recovery; a strong, memorable passphrase is essential.
- The crypto library `chacha20poly1305` 0.10 is well-reviewed (RustCrypto). The construction here is conservative (random nonce, AEAD, BLAKE3 KDF), but no formal audit has been performed.

### Backend
- `Store` now carries an optional `[u8; 32]` master key.
- `lock_set` / `lock_disable` / `lock_unlock` / `lock_now` all wire the key in/out and re-encrypt notes on transitions.

### Auto-update
- Pushing v0.8.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.7.0-beta.1 - Workspace lock

beta.7 adds a passphrase lock around the whole workspace. When enabled, the app starts on a passphrase prompt and you can lock-now any time. (Note: this is an *access lock*, not at-rest encryption — the underlying note files are still plaintext on disk. At-rest encryption lands in beta.8.)

## New in v0.7.0

### Workspace lock
- **Enable lock** in Settings → General → Privacy & lock. Pick a passphrase ≥ 6 chars.
- **Lock screen** at startup when enabled: full-screen passphrase prompt; correct entry reveals the workspace, wrong entry shows an error.
- **Lock now** button + palette command — re-locks immediately, useful when stepping away.
- **Change passphrase** + **Disable lock** flows in Settings.
- All note CRUD commands check the lock state and refuse if locked.

### Crypto
- Salt: 16 random bytes from the OS (`OsRng`).
- Verifier: BLAKE3 keyed-hash of `"mycelium-lock-v1" || salt || passphrase`, then 50,000 iterations of BLAKE3 chaining. Salt + verifier hex are stored in `settings.json` under `lock`. The passphrase itself is never persisted.

### Honest disclaimer
- This is a UI-level access lock, not encryption. Anyone with disk access can still read `%APPDATA%\Mycelium\notes\*.json`. At-rest age-encryption ships in beta.8.

### Backend
- 5 new commands: `lock_status`, `lock_set`, `lock_disable`, `lock_unlock`, `lock_now`.
- New deps: `blake3 = "1"`, `rand = "0.8"`.

### Auto-update
- Pushing v0.7.0-beta.1 triggers signed builds + manifest update.

---

# Mycelium v0.6.0-beta.1 - Power user

beta.6 piles on the small features that make Mycelium feel fast under your fingers. Selection toolbar, format shortcuts, sort options, spell-check toggle, keyboard cheatsheet.

## New in v0.6.0

### Editor
- **Floating selection toolbar**: select any text in the body and a small toolbar appears (B / I / `code` / strike / link / H1 / H2 / quote). One click wraps your selection.
- **Format shortcuts** in the body textarea:
  - `Ctrl+B` → wrap in `**bold**`
  - `Ctrl+I` → wrap in `*italic*`
  - `Ctrl+E` → wrap in `` `code` ``
  - `Ctrl+L` → wrap in `[selection](url)` (prompts for URL)
- **Spell check toggle** in Settings → General. Off by default to keep code/data text underline-free.

### Navigation
- **Note sort**: Settings → General offers Updated (newest), Created (newest), or Title (A-Z). Pinned notes always come first within the chosen sort.
- **Keyboard cheatsheet** modal (`Ctrl+/` from anywhere) lists every shortcut with its action.

### Backend
- `Settings` struct gains `spell_check: bool` and `sort_by: String` (back-compat defaults).
- No new commands.

### Auto-update
- Pushing v0.6.0-beta.1 triggers signed builds + manifest update. Installed v0.5.0 detects the upgrade on next launch.

## Upgrade

Launch Mycelium → updater offers v0.6.0 → install. Notes, themes, plugins, settings all carry over.

---

# Mycelium v0.5.0-beta.1 - Markdown power

beta.5 turns the Markdown preview into a real reading surface. Math, code highlighting, footnotes, definition lists, auto-links — the kind of features that make a notes app good for technical writing instead of just sticky notes.

## New in v0.5.0

### Markdown rendering

- **Math** with LaTeX-style syntax: `$E = mc^2$` inline, `$$ \int_0^\infty f(x)\,dx $$` block. Ships with ~50 common symbols (Greek, calculus, set theory, arrows, comparisons), `^{...}` superscripts, `_{...}` subscripts, and `\frac{a}{b}` fractions. No external KaTeX dependency — everything is a tiny Unicode-mapping render in `markdown.js`.
- **Code-block syntax highlighting** for `js`, `ts`, `rust`, `py`/`python`, `sh`/`bash`, and `json`. Keywords / strings / comments / function calls / numbers each get a class; tokens are theme-aware and re-coloured by light / dark / high-contrast.
- **Footnotes**: `Some claim[^1]` and `[^1]: the cited evidence`. Footnote definitions are collected from anywhere in the note and rendered as a numbered list at the bottom of the preview.
- **Definition lists**:
  ```
  Term
  : Definition line one
  : Definition line two
  ```
- **Auto-link bare URLs**: typing `https://example.com` in a paragraph now becomes a clickable link in preview without needing `[label](url)`.
- **Inline images via data URLs**: an attachment that's an image now renders as `<img>` (previously only `[label](data:...)` link syntax).

### Backend

No new commands — this release is pure frontend. Schema version unchanged.

### Auto-update

Pushing `v0.5.0-beta.1` triggers signed builds + manifest update. Installed `v0.4.0-beta.1` clients will detect the upgrade on next launch.

## Upgrade

Launch Mycelium → updater offers v0.5.0 → install. All your notes carry over (text-only changes; nothing in storage).

---

# Mycelium v0.4.0-beta.1 - capture + safety

beta.4 closes the two biggest gaps that stop Mycelium from being a real daily driver: you can now drop screenshots and PDFs straight into a note, and the app keeps a snapshot of every save so a bad rewrite is never destructive.

## New in v0.4.0

### Attachments
- **Drag-drop, paste, or click-to-attach** any file into a note. Images render inline in preview; other files become clickable download links.
- Stored as `data:` URLs inside the note body (no external file references for now). 5 MB per attachment limit; larger files land in beta.5 alongside a separate-storage scheme.
- New paperclip icon in the editor toolbar; the body textarea is also a drop zone (with a visible dashed border on hover).

### Note history
- **Automatic snapshots** on every save (with a 10 s cooldown to avoid disk thrashing on rapid edits).
- New history icon in the editor toolbar (`↻`) opens a modal listing every snapshot for the current note, newest first.
- **Restore any snapshot** with a single click — the current state is automatically snapshotted before the restore, so a wrong restore is itself undoable.
- **Purge all history** for a note when you want to clean up.
- Snapshots live in `%APPDATA%\Mycelium\history\<note-id>\<timestamp>.json`.

### Workspace backup &amp; restore
- **One-click backup**: Settings → Data → "Backup workspace..." downloads a single JSON file containing every note, theme, template, and your settings.
- **One-click restore**: pick a backup file, choose whether to overwrite same-ID notes or keep both, done.
- The backup format is a stable JSON envelope (`mycelium-workspace-v1`) so future versions stay readable.

### Saved searches
- After typing in the sidebar search, click the new `☆` icon to save the query under a name.
- Saved searches appear above the tag bar; click to re-run, click `×` to delete.

### Backend
- 6 new Tauri commands: `snapshot_note`, `list_history`, `restore_history`, `purge_history`, `export_workspace`, `import_workspace`, `attachment_data_url`.
- `Settings` schema gains `default_preview`, `show_backlinks`, `saved_searches` fields (back-compat defaults).

### Auto-update
- Tag-driven release pipeline produced signed `v0.4.0-beta.1` cleanly. Installed `v0.3.0-beta.1` clients will detect the upgrade on next launch.

## Upgrade

Launch Mycelium → updater offers v0.4.0 → click install. Your notes, templates, themes, plugins, trash, and settings carry over. Existing notes won't have history snapshots until you next edit them.

If installing fresh, see [`docs/INSTALLATION.md`](docs/INSTALLATION.md).

---

# Mycelium v0.3.0-beta.1 - daily-driver polish

This release sands every edge testers reported on beta.2: the editor finally handles checklists, tables, and long-document navigation. New journalling and template workflows turn Mycelium into a daily driver rather than a "neat demo".

## New in v0.3.0

### Editor
- **Task lists** with click-to-toggle checkboxes. Write `- [ ] thing` and `- [x] done` in your notes; in preview each box is interactive, and toggling one persists straight back to the source.
- **Tables** via the standard Markdown pipe syntax, with `:---`, `---:`, `:---:` alignment markers honoured.
- **Outline panel** in the editor: every `#` heading becomes a clickable entry that scrolls the textarea (and the preview) to that location. Toggle with the new outline icon in the editor toolbar.

### Workflow
- **Daily notes** (`Ctrl+D`): one shortcut opens (or creates) today's note titled `YYYY-MM-DD`. Perfect for journalling, standup logs, daily TODO captures.
- **Templates**: save the current note as a template (Settings → Data → "Save current note as template"), then create new notes from any template via the `▾` button next to "+ New note" in the sidebar, or via the command palette.
- **Duplicate note**: clone any note (title gets " (copy)" appended) via right-click or `Ctrl+K → Duplicate current note`.

### Navigation
- **Right-click context menu** on any sidebar note: pin/unpin, duplicate, export-to-Markdown, move-to-trash, all without leaving the list.

### Backend
- 7 new Tauri commands: `daily_note`, `duplicate_note`, `list_templates`, `save_template`, `delete_template`, `note_from_template`, `outline`.
- Templates live in `%APPDATA%\Mycelium\templates\<ulid>.json`.

### Auto-update
- Tag-driven release workflow signed `v0.3.0-beta.1` cleanly. The `latest.json` manifest bumps to `0.3.0` so installed `v0.2.0-beta.1` clients detect the upgrade on next launch.

## Upgrade

Launch Mycelium. The updater offers v0.3.0 automatically. Your notes, themes, plugins, and trash all carry over.

If you're installing fresh, see [`docs/INSTALLATION.md`](docs/INSTALLATION.md).

## SHA-256 hashes

```powershell
Get-FileHash -Algorithm SHA256 .\Mycelium_0.3.0_x64-setup.exe
```

---

# Mycelium v0.2.0-beta.1 - workspace feature drop

> **Closed beta release** - Windows 10/11 + Linux x86_64 + macOS arm64. The desktop app, an unsigned `.deb`, an `.AppImage`, and an `.dmg` ship; signed bundles + `.sig` updater artefacts for every Windows + Linux target.

This release turns Mycelium from a textarea-with-autosave into a real workspace. Everything below is single-device M0; the BEAM/Lustre/Iroh/SurrealDB sync stack lands in beta.3+.

## New in v0.2.0

### Editor
- **Markdown rendering** with a side-by-side preview pane. Toggle with `Ctrl+M` or the eye icon. Supports headings, bold/italic/strike, lists, blockquotes, code blocks, links, horizontal rules.
- **`[[wiki-links]]`** between notes. Clicking a wiki-link opens the referenced note; clicking one that doesn't exist offers to create it.
- **Backlinks panel** on every note: lists everything that references the current note via `[[...]]`. Toggle in Settings -> General.
- **`#tag` syntax** in note bodies. Tags are extracted automatically and shown both inline (in the preview) and as filterable chips above the note list.
- **Pin notes** to the top of the list via the star icon or palette command.
- **Note stats** (words / chars / read-time) live in the editor footer.

### Navigation
- **Command palette** (`Ctrl+K`): fuzzy-search across all notes plus a curated set of commands (new note, toggle preview, export, import, cycle theme, ...). Arrow keys + enter to run.
- **Full-text search**: the sidebar search box now matches title OR body, with a snippet preview under each hit.
- **Tag chips** above the note list filter by `#tag`. Click "All" to clear the filter.

### Data
- **Trash** (soft delete): deleting a note moves it to a trash view (sidebar -> "Trash"). Restore or delete-forever from there. Empty-trash button.
- **Export note to Markdown** (single note via the export icon, or all notes via Settings -> Data -> "Export all notes").
- **Import Markdown** files (Settings -> Data -> "Import Markdown file..."). The first `# heading` becomes the title.

### Plumbing
- `Note` schema bumped to v2 (adds `pinned`, `trashed_at`). Older files migrate transparently on first read.
- 15 new Tauri commands: `search_notes`, `set_pinned`, `list_trash`, `restore_note`, `purge_note`, `empty_trash`, `all_tags`, `backlinks`, `export_note_md`, `export_all_md`, `import_md`, `note_stats`, plus auxiliary helpers.
- Vendored a small (~120 LOC) Markdown subset parser in `apps/desktop/resources/frontend/markdown.js` -- no external dependency added.

### Settings
- New **Data** tab: import / export / open data folder.
- New **General** options: "Open notes in preview mode by default", "Show the backlinks panel".

### Auto-updater
- Tag-driven release workflow is now fully signed end-to-end. Pushing `v0.2.0-beta.1` produced four `.sig` files (NSIS + 2 MSI + AppImage) without manual intervention. Your installed v0.1.0-beta.1 will detect this build via `latest.json` on the next launch and offer the upgrade.

## Not in this release (still beta.3+)

- macOS / Linux installer signing with Apple Developer ID and `dpkg-sig`.
- Two-device sync (Iroh).
- At-rest encryption (age).
- BEAM core / Lustre UI / Wasm plugins (sandboxed JS plugins still work).
- On-device semantic search.

## Upgrading

If you installed v0.1.0-beta.1, just launch Mycelium. The updater offers v0.2.0 automatically. Your notes carry over (they're plain JSON files; the new fields are added on first save).

If you're installing fresh, see [`docs/INSTALLATION.md`](docs/INSTALLATION.md).

## SHA-256 hashes

Published in `sha256sums.txt` alongside the artifacts. Verify with:

```powershell
Get-FileHash -Algorithm SHA256 .\Mycelium_0.2.0_x64-setup.exe
```

---

# Mycelium v0.1.0-beta.1 - first beta

> **Closed beta release** - Windows 10/11 only. macOS and Linux installers will follow.

Mycelium is a local-first, end-to-end encrypted, peer-to-peer collaborative knowledge workspace. **Beta.1** ships the Tauri-native single-device experience: install, open, write notes, close, reopen, see them. The full BEAM/Lustre/Iroh/SurrealDB architecture in the source tree is what beta.2+ delivers.

## What works in beta.1

- **Notes** - create, edit, search by title, persist locally as JSON files in `%APPDATA%\Mycelium\notes\`.
- **Auto-save** - 500 ms debounce after typing stops; atomic write (no torn files).
- **Themes** - dark (default), light, high-contrast - cycle with `Ctrl+,` or the sun icon.
- **Keyboard shortcuts** - `Ctrl+N` (new note), `Ctrl+S` (force save), `Ctrl+,` (cycle theme), `/` (focus search), `Esc` (clear search).
- **Search** - instant case-insensitive substring match against note titles.
- **Self-contained installer** - no external runtime, no toolchain, no source clone. Double-click and run.

## What is deliberately not in beta.1

| Capability | Lands in |
|---|---|
| Peer-to-peer device sync (Iroh QUIC) | beta.2 |
| Encryption at rest (age + BLAKE3 + Ed25519) | beta.2 |
| Block editor (paragraph / heading / bullet) | beta.2 |
| BEAM-backed UI (Lustre server-components over WebSocket) | beta.2 |
| Plugins (Wasm sandbox) | beta.3 |
| Semantic / vector search (fastembed) | beta.3 |
| macOS + Linux installers | beta.3 |
| Code signing (no SmartScreen warning) | beta.4 |
| Auto-update | beta.4 |
| Cryptography audit | beta.4 |

The full architecture exists in the source repository - sidecars compile, BEAM application compiles, ports speak JSON-RPC, schemas validate. Beta.1 ships a slim Tauri-only frontend so testers can install and use it without an Erlang/Gleam toolchain.

## Installation

The release artifacts:

- `Mycelium_0.1.0_x64-setup.exe` - NSIS installer (1.5 MB)
- `Mycelium_0.1.0_x64_en-US.msi` - WiX installer, English (2.2 MB)
- `Mycelium_0.1.0_x64_fr-FR.msi` - WiX installer, French (2.2 MB)
- `mycelium-relay.exe` - headless relay binary, optional, used by beta.2+ sync (9.5 MB)
- `docs/INSTALLATION.md` - install guide
- `sha256sums.txt` - hashes for verification

See `docs/INSTALLATION.md` for the install / first-run flow.

## Reporting bugs

Open issues at https://github.com/Arka-ui/mycelium/issues with:
- Mycelium version (shown in the sidebar footer)
- Windows version (`winver`)
- Steps to reproduce
- Expected vs actual

## Cryptography

This release does not yet exercise the cryptographic stack. Beta.2 will turn on Ed25519, X25519, BLAKE3, age (ChaCha20-Poly1305), SPAKE2, and TLS 1.3 over QUIC. **No cryptographic audit has been performed.** Do not store sensitive data in any beta build.

## Acknowledgements

Built on Tauri 2 (Rust + system webview). The wider architecture in the repo: BEAM (Erlang/OTP 27), Gleam 1.16, Mist + Wisp + Lustre, Loro for CRDTs, Iroh for P2P, SurrealDB for storage, age for encryption, Wasmtime for plugins.

## SHA-256 hashes

Hashes are published in `sha256sums.txt` alongside the artifacts. Verify with:

```powershell
Get-FileHash -Algorithm SHA256 .\Mycelium_0.1.0_x64-setup.exe
```
