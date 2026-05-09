# M0 round-trip smoke test

Manual checklist verifying the M0 walking skeleton end-to-end. Future contributors should follow this on a fresh checkout to confirm M0 is not regressed.

## Preconditions

- Toolchain installed per [`../../docs/SETUP.md`](../../docs/SETUP.md). All seven commands in §6 print versions.
- Repository checkout clean (`git status` shows no modifications).
- `%APPDATA%\Mycelium\` either absent or empty (delete it for a clean test run).

## Steps

1. From the repository root, run `just install-deps`. Expect: every tool prints its version, exit code 0.
2. Run `just build`. Expect: zero warnings, zero errors. Build artifacts appear under `target/`, `apps/core/build/`, `apps/frontend/build/`.
3. Run `just dev`. Expect: a Tauri window opens within ~3 seconds. Title bar reads "Mycelium".
4. The window shows a sidebar (empty) and a "+ New Note" button. The editor pane shows "Select a note from the sidebar."
5. Click "+ New Note". Expect: a new entry "Untitled" appears in the sidebar and is automatically selected. Editor pane shows an empty paragraph block with a focus cursor.
6. Type the text `hello mycelium`. Expect: the text appears in the block as you type, with no perceptible lag (per NFR-PERF-02, ≤ 16 ms).
7. Wait ~600 ms for the debounced save to fire. Expect: no UI change; the save is silent.
8. Close the window. Expect: the BEAM child process exits within ~5 s. The Tauri process exits cleanly. No popups or error dialogs.
9. Inspect `%APPDATA%\Mycelium\db\`. Expect: RocksDB SST files exist (`*.sst`, `MANIFEST-*`, `CURRENT`).
10. Run `just dev` again. Expect: Tauri window opens; sidebar shows "Untitled" (or whatever title was inferred). Click it. Editor pane shows the previously typed paragraph.

## Failure recovery

If any step fails:

- **Step 1**: re-run [`../../docs/SETUP.md`](../../docs/SETUP.md). Most failures are missing PATH entries after a fresh scoop install.
- **Step 2**: read the build error. The most likely causes are MSVC build tools missing (linker error) or a Gleam/Rust dependency download failure (network).
- **Step 3**: check `apps/core/build/dev/erlang/mycelium/` exists; if not, the BEAM compile failed silently. Re-run `gleam build` directly inside `apps/core/`.
- **Step 5**: open the Tauri devtools (Ctrl+Shift+I) and inspect the WebSocket frames. Most likely the editor session failed to register; check the BEAM logs at `%APPDATA%\Mycelium\logs\`.
- **Step 9**: if the directory is missing, the surreal_port sidecar didn't start. Check `apps/desktop\bin\surreal_port.exe` exists; the build's copy step may have failed.
- **Step 10**: if notes don't persist, the sidecar's `update_node` call failed. Tail `%APPDATA%\Mycelium\logs\` for the JSON-RPC error.

## What this test does NOT cover

- Multi-device sync (M1).
- Encryption at rest (M2 — the database is plaintext in M0).
- Plugins (M2).
- Cross-OS behaviour (M3 — only Windows is verified for M0).

The full M1/M2 acceptance suite is in `tests/integration/` and `tests/property/`, currently scaffolded.
