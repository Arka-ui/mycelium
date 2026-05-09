# Nix builders

Custom Nix derivations used by `flake.nix`. Currently empty — the flake at the repository root is an M0 stub. The full per-target builders land in M3 (per `docs/architecture/roadmap.md`):

- `mycelium-desktop-linux-{x86_64,aarch64}.nix` — Linux desktop bundles (`.deb`, `.rpm`, `.AppImage`).
- `mycelium-desktop-macos-{x86_64,aarch64}.nix` — macOS bundles (`.dmg`).
- `mycelium-desktop-windows-{x86_64,aarch64}.nix` — Windows installers (cross-compiled from Linux via Zig + WiX).
- `mycelium-server-linux-{x86_64,aarch64}.nix` — headless relay binaries.
- `mycelium-cli-linux-{x86_64,aarch64}.nix` — CLI binaries.

Each builder pins:
- Erlang/OTP version
- Gleam compiler version
- Rust toolchain version
- All transitive crate hashes (via `cargoLock`)
- All transitive Hex package hashes (via `gleam.lock`)
- System dependencies (libssl, RocksDB, WebKitGTK, etc.)

The reproducibility check in `infra/ci/check.yml` runs `nix build` twice and asserts byte-identical output (per FR-DEPLOY-04).
