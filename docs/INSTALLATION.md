# Mycelium installation guide

> **Audience: end users installing a released binary.** Contributors building from source should read [`SETUP.md`](SETUP.md) instead.
>
> Current latest beta is **v0.10.0-beta.1**. Newer betas (v0.11..v0.74) have shipped on `main` and reach users via the in-app auto-updater; a fresh installer download is only needed for first install. See [CHANGELOG](../CHANGELOG.md) for what each beta adds.

## Install

1. Download `Mycelium_0.10.0_x64-setup.exe` (NSIS) **or** `Mycelium_0.10.0_x64_en-US.msi` (WiX) from the [release page](https://github.com/Arka-ui/mycelium/releases/tag/v0.10.0-beta.1).
2. Double-click the installer. Windows SmartScreen may warn (no code signing yet) - click **More info -> Run anyway**.
3. Launch from the Start menu. The window opens straight to the editor.

That is the entire install. No toolchain, no clone, no command line.

## What the installer puts on your machine

- `C:\Program Files\Mycelium\Mycelium.exe` - the desktop app
- Start-menu shortcut + Add-or-remove-programs entry
- Your data: `%APPDATA%\Mycelium\notes\` (one JSON file per note)

## First run

1. Window opens with a sidebar and an empty editor.
2. Click **+ New note** or press `Ctrl+N`.
3. Type a title, press `Tab` (or click below) and write the body.
4. Auto-save fires 500 ms after you stop typing.
5. Close the app, open it again - your note is still there.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New note |
| `Ctrl+S` | Force save now |
| `Ctrl+,` | Cycle theme (dark / light / high-contrast) |
| `/` | Focus the search bar |
| `Esc` | Clear search |

## Themes

Click the sun icon in the sidebar header (or `Ctrl+,`) to cycle: dark (default) -> light -> high-contrast.

## Optional: self-host a relay

For the multi-device sync planned in beta.2+, the headless relay binary is available as a separate download:

```powershell
mycelium-relay.exe --data-dir C:\mycelium-relay-data --port 4321
```

The relay buffers ciphertext between peers that are rarely online together. It is not used by beta.1 because peer-to-peer sync ships in beta.2.

## Uninstall

- "Add or remove programs" - search **Mycelium**.
- Your notes at `%APPDATA%\Mycelium\notes\` are **not** removed automatically. Delete the folder if you want a clean wipe.

## What is in this beta

- Local notes: create, edit, search by title, persist on disk
- Auto-save with 500 ms debounce
- Three themes (dark / light / high-contrast)
- Keyboard shortcuts above

## What is **not** yet in this beta

- Peer-to-peer sync between devices (beta.2)
- End-to-end encryption at rest (beta.2)
- Plugins (beta.3)
- On-device semantic search (beta.3)
- Code signing (no SmartScreen warning) (beta.4)
- macOS / Linux installers

The full BEAM/Lustre/Iroh/SurrealDB architecture lives in the source tree at https://github.com/Arka-ui/mycelium and is what beta.2+ ships. Beta.1 ships a slim Tauri-only build so you can use it today without installing a toolchain.

## Troubleshooting

| Symptom | Fix |
|---|---|
| SmartScreen blocks the install | Click **More info -> Run anyway**. The build is unsigned in this beta. |
| Window opens blank | Right-click the window, choose **Reload**, or relaunch from the Start menu. Report the issue if it persists. |
| Notes not saving | Check `%APPDATA%\Mycelium\notes\` is writable. The app uses atomic write (`*.json.tmp` then rename) so partial writes are not possible. |
| Cannot find my notes after uninstall | They were left behind on purpose at `%APPDATA%\Mycelium\notes\`. Reinstall and they reappear. |

## Reporting bugs

Open an issue at https://github.com/Arka-ui/mycelium/issues with:
- Beta version (shown in the sidebar footer)
- Windows version (`winver`)
- Reproduction steps
- Expected vs actual behaviour
