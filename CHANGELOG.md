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
