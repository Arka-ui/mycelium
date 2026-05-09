# ADR-0008 — Tauri for the desktop shell

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team

## Context

Mycelium ships as a native desktop application on macOS, Windows, and Linux (per FR-DEPLOY-01/02). We need a host process that:

- Embeds a webview (renders the Lustre frontend served by the local BEAM HTTP).
- Bundles the BEAM release and the sidecar binaries into one redistributable artifact.
- Manages the BEAM child process (spawn, ready signal, graceful shutdown).
- Exposes OS integration (native menus, notifications, deep links, file-open intents).

Three frameworks were candidates:

- **Electron** — Chromium + Node.js per app. ~150 MB bundle. Memory-heavy. The Node.js runtime is dead weight (we use the BEAM and Rust, not Node).
- **Wails** — Go-based. Smaller bundle, but our host code is Rust; mixing Go for shell and Rust for sidecars complicates the build matrix.
- **Tauri** — Rust host process + system webview (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux). Bundle size 10–20 MB. The host is Rust, matching our sidecar stack.

## Decision

Use **Tauri v2** as the desktop shell. The Rust host (`apps/desktop/`) is the supervisor of the BEAM release. On startup it spawns the BEAM, waits for the `MYCELIUM_READY` line on stdout, opens a named pipe for ongoing IPC (per ADR-0012), and points the webview at the BEAM's HTTP port.

## Consequences

- Bundle size is small (10–20 MB excluding the BEAM release and sidecars; total ~80 MB once Erlang OTP and the Rust binaries are included).
- The host language is Rust, consistent with the sidecars. One toolchain, one CI matrix, one mental model for native build issues.
- System webview means OS upgrades patch the renderer without us shipping an update. Lower maintenance burden, but a slightly different behaviour set per OS — Tauri abstracts most of it; we'll need OS-specific E2E tests anyway (per R-06).
- Tauri v2's mobile support is maturing but out of scope for v1.0 (per SPECIFICATION §5.2). The architecture doesn't preclude it for post-1.0.
- Distribution per platform: Tauri produces `.dmg` (macOS), `.msi` + `.exe` (Windows), `.deb` + `.rpm` + `.AppImage` (Linux) from the same source.

## References

- `../MYCELIUM.md` §5 (Stack), §6 (Layer 1).
- `../SPECIFICATION.md` FR-DEPLOY-01/02, R-06 (Tauri inconsistency mitigation).
- Tauri: https://tauri.app
