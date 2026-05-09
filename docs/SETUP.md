# Setup

> **Audience: contributors building Mycelium from source.** End users installing a released binary should read [`INSTALLATION.md`](INSTALLATION.md) instead.

This document installs the Mycelium toolchain. One-time per machine.

The build pipeline targets three host operating systems. On Windows the official path is **PowerShell + scoop + cargo**. On Linux and macOS the official path is the **Nix flake** at the repository root (`nix develop` drops you in a shell with every tool pinned). This document covers Windows in detail; the Nix path is single-command.

---

## Windows (primary)

Open **PowerShell** (not Command Prompt). The installs do not require administrator privileges.

### 1. Scoop

If `scoop` is not on `PATH`, install it once:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
```

### 2. Erlang/OTP, Gleam, just, rebar3, LLVM

```powershell
scoop install erlang gleam just rebar3 llvm
```

This pulls:

- **Erlang/OTP** (provides `erl.exe`, `erlc.exe`, `escript.exe`).
- **Gleam** compiler.
- **just** task runner.
- **rebar3** — required by Gleam at build time when transitive deps include Erlang `.app` files (which `mist`, `wisp`, `gleam_otp` all do).
- **LLVM** — required by the `bindgen` crate that the SurrealDB sidecar uses to generate Rust↔C++ FFI for RocksDB.

After installation, set the `LIBCLANG_PATH` environment variable persistently so cargo can find `libclang.dll`:

```powershell
[Environment]::SetEnvironmentVariable("LIBCLANG_PATH", "$env:USERPROFILE\scoop\apps\llvm\current\bin", "User")
```

Restart PowerShell for the variable to take effect in new shells.

### 3. Rust toolchain

If `cargo --version` already prints a recent version (≥ 1.78), skip. Otherwise:

```powershell
Invoke-RestMethod -Uri https://win.rustup.rs -OutFile rustup-init.exe
.\rustup-init.exe -y --default-toolchain stable --profile default
Remove-Item rustup-init.exe
```

You also need the **MSVC C++ build tools** (linker for native crates). If `cargo build` fails with `error: linker 'link.exe' not found`, install **Build Tools for Visual Studio** with the *Desktop development with C++* workload:

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --accept-source-agreements --accept-package-agreements
```

Then re-launch PowerShell.

### 4. Tauri CLI

```powershell
cargo install tauri-cli --locked
```

This produces the `cargo tauri` subcommand.

### 5. Node.js (for Tauri's frontend bundler)

Most likely already present. Verify:

```powershell
node --version    # v18+ recommended
npm --version
```

If absent: `scoop install nodejs-lts`.

### 6. Verify

```powershell
erl -version
gleam --version
cargo --version
rustc --version
cargo tauri --version
just --version
node --version
rebar3 --version
clang --version
```

All nine must succeed before continuing.

### 7. Enable Windows Developer Mode (for Lustre's JS build)

The Gleam JavaScript compiler creates symbolic links inside its build directory. On Windows this requires Developer Mode (or admin), and the privilege error from a non-Developer-Mode build is opaque (`os error 1314`).

Enable it once, no admin rights required:

> Settings → Privacy & security → For developers → Developer Mode = On

This is a one-time per-user setting. Verify by checking `(Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock").AllowDevelopmentWithoutDevLicense` returns `1`.

---

## Linux / macOS (Nix path)

The Nix flake at the repository root pins every tool. From the repository root:

```bash
nix develop
```

This drops you into a shell with Erlang, Gleam, Rust, Tauri CLI, just, and Node — at the exact versions the project expects. No system installs.

> **M0 note:** the `flake.nix` shipped today is a stub; the full Nix builders for the BEAM release and the Tauri bundle are M3 work. On Linux/macOS today, install the toolchain manually (matching the Windows step list above with your package manager), or use WSL to consume future updates of the flake.

---

## Repository checkout

Pick a workspace directory of your choice (referred to as `<repo-root>` in the rest of this guide):

```powershell
git clone https://github.com/Arka-ui/mycelium.git
cd mycelium
```

Mycelium uses no Git submodules.

---

## First build

```powershell
just install-deps   # re-verifies toolchain
just build          # builds sidecars + frontend + core + desktop
```

The first `just build` downloads dependencies and may take ~10 minutes (Rust compilation, Gleam package fetch). Subsequent builds are incremental.

To launch the app in development mode:

```powershell
just dev
```

Tauri opens a window. The BEAM is launched in the background, prints `MYCELIUM_READY {...}` to stdout once ready, and the webview navigates to the local HTTP port.

To shut down: close the window. Tauri sends a graceful shutdown over the named pipe; the BEAM drains and exits within ~5 s.

---

## Troubleshooting

**`gleam` not on PATH after `scoop install`:** restart PowerShell, then run `scoop reset gleam` to ensure the shim is current.

**`erl.exe` cannot find Erlang installation:** scoop may have installed Erlang under `~\scoop\apps\erlang\current\`. Confirm `$env:ERLANG_HOME` is set; if not, `scoop reset erlang` and re-launch.

**`cargo tauri build` fails on WebView2:** install the Microsoft Edge WebView2 Runtime (preinstalled on Windows 11 ≥ 22H2). On older systems: `winget install Microsoft.EdgeWebView2Runtime`.

**Antivirus quarantines `surreal_port.exe` on first build:** add `<repo-root>\target\` to the antivirus exclusion list. Only Microsoft Defender on default settings has been observed to do this; it is harmless to allow the build artifact.

**SurrealDB sidecar refuses to open the DB after a crash:** delete the `LOCK` file under `%APPDATA%\Mycelium\db\`. RocksDB sometimes leaves a stale lock after `kill -9`.

---

## Uninstall

```powershell
scoop uninstall erlang gleam just
cargo uninstall tauri-cli
Remove-Item -Recurse $env:APPDATA\Mycelium      # workspace data
Remove-Item -Recurse <repo-root>\target           # build artifacts
```
