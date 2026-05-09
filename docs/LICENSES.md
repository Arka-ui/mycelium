# Third-party licenses

Inventory of every third-party dependency we depend on, with its SPDX identifier and AGPL-3.0 compatibility column.

This file is regenerated on every dependency change as part of the CI pipeline (see `infra/ci/` — the `licenses` job runs `cargo-deny` and `gleam deps list` and reconciles against this table).

The columns:

- **Component** — the dependency name as it appears in `Cargo.toml` / `gleam.toml`.
- **Source** — where it is hosted (crates.io, hex.pm, GitHub).
- **License** — SPDX identifier.
- **AGPL-3.0 compatible?** — Yes / No / Conditional. AGPL-3.0 is incompatible with strong copyleft licenses other than itself; permissive licenses (MIT, Apache-2.0, BSD-*, ISC, MPL-2.0) are compatible.

---

## Runtime dependencies (BEAM core, `apps/core`)

| Component | Source | License | AGPL-3.0 compatible? |
|---|---|---|---|
| Erlang/OTP | erlang.org | Apache-2.0 | Yes |
| gleam_stdlib | hex.pm | Apache-2.0 | Yes |
| gleam_otp | hex.pm | Apache-2.0 | Yes |
| gleam_erlang | hex.pm | Apache-2.0 | Yes |
| gleam_json | hex.pm | Apache-2.0 | Yes |
| gleam_http | hex.pm | Apache-2.0 | Yes |
| mist | hex.pm | Apache-2.0 | Yes |
| wisp | hex.pm | Apache-2.0 | Yes |
| lustre | hex.pm | Apache-2.0 | Yes |

## Frontend dependencies (`apps/frontend`)

| Component | Source | License | AGPL-3.0 compatible? |
|---|---|---|---|
| gleam_stdlib (JS target) | hex.pm | Apache-2.0 | Yes |
| lustre (JS target, runtime) | hex.pm | Apache-2.0 | Yes |

## Sidecar dependencies (Rust)

### `sidecars/surreal_port` (M0 functional)

| Component | Source | License | AGPL-3.0 compatible? |
|---|---|---|---|
| surrealdb | crates.io | Apache-2.0 | Yes |
| rocksdb (transitively) | crates.io | Apache-2.0 OR MIT | Yes |
| tokio | crates.io | MIT | Yes |
| serde | crates.io | MIT OR Apache-2.0 | Yes |
| serde_json | crates.io | MIT OR Apache-2.0 | Yes |
| anyhow | crates.io | MIT OR Apache-2.0 | Yes |
| tracing | crates.io | MIT | Yes |
| tracing-subscriber | crates.io | MIT | Yes |

### `sidecars/loro_port` (M1 — declared, not yet linked)

| Component | Source | License | AGPL-3.0 compatible? |
|---|---|---|---|
| loro | crates.io | MIT | Yes |
| (shared infra deps) | — | — | — |

### `sidecars/iroh_port` (M1 — declared, not yet linked)

| Component | Source | License | AGPL-3.0 compatible? |
|---|---|---|---|
| iroh | crates.io | Apache-2.0 OR MIT | Yes |
| iroh-blobs | crates.io | Apache-2.0 OR MIT | Yes |
| iroh-net | crates.io | Apache-2.0 OR MIT | Yes |

### `sidecars/fastembed_port` (M2 — declared, not yet linked)

| Component | Source | License | AGPL-3.0 compatible? |
|---|---|---|---|
| fastembed | crates.io | Apache-2.0 | Yes |
| candle-core | crates.io | MIT OR Apache-2.0 | Yes |
| ort (ONNX Runtime, optional) | crates.io | MIT OR Apache-2.0 | Yes |

### `sidecars/wasmedge_port` (M2 — declared, not yet linked)

| Component | Source | License | AGPL-3.0 compatible? |
|---|---|---|---|
| wasmedge-sdk | crates.io | Apache-2.0 | Yes |

## Desktop host (`apps/desktop`)

| Component | Source | License | AGPL-3.0 compatible? |
|---|---|---|---|
| tauri | crates.io | Apache-2.0 OR MIT | Yes |
| tauri-build | crates.io | Apache-2.0 OR MIT | Yes |
| tokio | crates.io | MIT | Yes |
| serde | crates.io | MIT OR Apache-2.0 | Yes |
| serde_json | crates.io | MIT OR Apache-2.0 | Yes |
| anyhow | crates.io | MIT OR Apache-2.0 | Yes |
| tracing | crates.io | MIT | Yes |
| tracing-appender | crates.io | MIT | Yes |
| windows-sys (Windows only) | crates.io | MIT OR Apache-2.0 | Yes |

## Plugin SDK (`plugins/sdk`) — MIT-licensed

The plugin SDK is licensed MIT (per SPECIFICATION §14.1) so plugin authors may ship closed-source plugins. The SDK depends on:

| Component | Source | License | MIT compatible? |
|---|---|---|---|
| wit-bindgen | crates.io | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT | Yes |
| serde | crates.io | MIT OR Apache-2.0 | Yes |
| serde_json | crates.io | MIT OR Apache-2.0 | Yes |

## Cryptographic primitives (M1+)

These crates are scheduled for M1 integration. Listed here for transparency and audit pre-positioning.

| Component | Source | License | AGPL-3.0 compatible? | Used for |
|---|---|---|---|---|
| age | crates.io | MIT OR Apache-2.0 | Yes | At-rest encryption (FR-CRYPTO-07/08), op-log encryption (FR-CRYPTO-09) |
| ed25519-dalek | crates.io | BSD-3-Clause | Yes | Device identity, ring identity (FR-CRYPTO-01/02) |
| x25519-dalek | crates.io | BSD-3-Clause | Yes | Key agreement (age internals) |
| chacha20poly1305 | crates.io | Apache-2.0 OR MIT | Yes | AEAD (age internals) |
| blake3 | crates.io | CC0-1.0 OR Apache-2.0 OR Apache-2.0 WITH LLVM-exception | Yes | Content addressing (FR-NOTES-06) |
| spake2 | crates.io | MIT | Yes | Remote pairing (FR-CRYPTO-04) |

## Build tools (not shipped)

| Component | Source | License |
|---|---|---|
| Rust toolchain | rust-lang.org | MIT OR Apache-2.0 |
| Gleam compiler | gleam.run | Apache-2.0 |
| just | crates.io | CC0-1.0 |
| Nix | nixos.org | LGPL-2.1-or-later |
| Tauri CLI | crates.io | Apache-2.0 OR MIT |

These are tools used to build the project, not redistributed with it.

---

## Forbidden licenses

The following SPDX identifiers are **not permitted** in the application core (i.e., anything under `apps/core`, `apps/desktop`, `sidecars/*`):

- GPL-2.0-only, GPL-3.0-only (one-way incompatible with AGPL-3.0)
- LGPL-2.1-only, LGPL-3.0-only (linking restrictions inconsistent with AGPL distribution)
- Proprietary or "source-available but not OSI-approved" licenses (BSL, Elastic License, SSPL, etc.)
- "No-commercial-use" or "ethical source" licenses with usage restrictions

The plugin SDK has stricter compatibility requirements: only MIT, Apache-2.0, BSD-*, ISC, CC0, Unlicense. Reference plugins under `plugins/examples/` may use any AGPL-compatible license but must declare it in their directory.

The CI `licenses` job blocks merge if any forbidden license is introduced.
