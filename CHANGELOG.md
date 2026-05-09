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
