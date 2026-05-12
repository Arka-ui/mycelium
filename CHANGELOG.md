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
