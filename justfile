# Mycelium task runner.
#
# Recipes are PowerShell-aware on Windows; the same recipes work in bash on
# Linux/macOS. Run `just` (no args) to list available recipes.
#
# Convention: every recipe operates from the repository root; recipes that need
# to enter a subdirectory use `Push-Location`/`pushd` and pop on exit.

set windows-shell := ["powershell.exe", "-NoProfile", "-Command"]
set shell := ["bash", "-cu"]

# --- Defaults ---

# Print the recipe list (running `just` with no recipe).
default:
    @just --list --unsorted

# --- Toolchain ---

# Verify every required toolchain component is on PATH and prints its version.
install-deps:
    @echo "--- Toolchain verification ---"
    @erl -version
    @gleam --version
    @cargo --version
    @rustc --version
    @cargo tauri --version
    @just --version
    @node --version
    @echo "OK"

# --- Formatting ---

# Format every Gleam app and the Rust workspace. Aborts on first error.
fmt:
    cd apps/core     && gleam format
    cd apps/frontend && gleam format
    cd apps/cli      && gleam format
    cargo fmt --all

# Check formatting without modifying files (used by CI).
fmt-check:
    cd apps/core     && gleam format --check
    cd apps/frontend && gleam format --check
    cd apps/cli      && gleam format --check
    cargo fmt --all --check

# --- Static checks ---

# Type-check Gleam apps and run cargo check on the Rust workspace.
check:
    cd apps/core     && gleam check
    cd apps/frontend && gleam check --target javascript
    cd apps/cli      && gleam check
    cargo check --workspace --all-targets
    cargo clippy --workspace --all-targets -- --deny warnings

# --- Builds ---

# Build the surreal_port sidecar (M0 functional) in release mode and copy the
# binary into apps/desktop/bin/ where Tauri picks it up at packaging time.
build-sidecar:
    cargo build --release -p surreal_port
    @just _copy-sidecar surreal_port

# Build the M1/M2 stub sidecars in release mode (small, fast).
build-sidecar-stubs:
    cargo build --release -p loro_port -p iroh_port -p fastembed_port -p wasmedge_port
    @just _copy-sidecar loro_port
    @just _copy-sidecar iroh_port
    @just _copy-sidecar fastembed_port
    @just _copy-sidecar wasmedge_port

# Internal: copy a sidecar binary into apps/desktop/bin/.
_copy-sidecar name:
    @if [ "$OS" = "Windows_NT" ]; then \
        powershell -Command "Copy-Item target/release/{{name}}.exe apps/desktop/bin/ -Force"; \
    else \
        cp target/release/{{name}} apps/desktop/bin/; \
    fi

# Build the Lustre frontend to JavaScript and copy the result into the Tauri
# resources directory.
build-frontend:
    cd apps/frontend && gleam build --target javascript
    @if [ "$OS" = "Windows_NT" ]; then \
        powershell -Command "Copy-Item -Recurse -Force apps/frontend/build/dev/javascript/frontend/* apps/desktop/resources/frontend/"; \
    else \
        cp -R apps/frontend/build/dev/javascript/frontend/. apps/desktop/resources/frontend/; \
    fi

# Compile the Gleam BEAM core. The output lives under apps/core/build/.
build-core:
    cd apps/core && gleam build

# Build the Tauri desktop host. Depends on the sidecars + frontend + core
# being built so they can be bundled.
build-desktop: build-sidecar build-sidecar-stubs build-frontend build-core
    cd apps/desktop && cargo tauri build

# Top-level build: every component, release mode.
build: build-sidecar build-sidecar-stubs build-frontend build-core
    cd apps/desktop && cargo tauri build

# --- Development ---

# Run the app with hot-reload in development mode.
dev: build-sidecar build-frontend build-core
    cd apps/desktop && cargo tauri dev

# Placeholder: M1 will run two app instances side-by-side to exercise sync.
dev-pair:
    @echo "dev-pair is M1 work — Loro CRDT + Iroh sync are not yet implemented."
    @echo "See docs/architecture/roadmap.md."

# --- Testing ---

# Run unit tests across every component.
test:
    cd apps/core     && gleam test
    cd apps/frontend && gleam test
    cd apps/cli      && gleam test
    cargo test --workspace

# --- Cleanup ---

# Remove every build artifact. Source tree only; the user's workspace data
# under %APPDATA%/Mycelium is left untouched.
clean:
    @if [ "$OS" = "Windows_NT" ]; then \
        powershell -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue target, apps/core/build, apps/frontend/build, apps/cli/build, apps/desktop/bin/*.exe, apps/desktop/resources/frontend/*"; \
    else \
        rm -rf target apps/core/build apps/frontend/build apps/cli/build apps/desktop/bin/* apps/desktop/resources/frontend/*; \
    fi

# --- Documentation ---

# Print the location of each generated documentation surface.
docs:
    @echo "Architecture: docs/architecture/"
    @echo "Protocols:    docs/protocols/"
    @echo "Plugin docs:  docs/plugins/"
    @echo "Threat model: docs/threat_model.md"
    @echo "Spec:         SPECIFICATION.md"
    @echo "Architecture: MYCELIUM.md"
