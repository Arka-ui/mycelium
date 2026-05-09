# Mycelium

[![ci](https://github.com/Arka-ui/mycelium/actions/workflows/ci.yml/badge.svg)](https://github.com/Arka-ui/mycelium/actions/workflows/ci.yml)
[![security](https://github.com/Arka-ui/mycelium/actions/workflows/security.yml/badge.svg)](https://github.com/Arka-ui/mycelium/actions/workflows/security.yml)
[![license: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg)](LICENSE)
[![release](https://img.shields.io/github/v/release/Arka-ui/mycelium?include_prereleases)](https://github.com/Arka-ui/mycelium/releases)

> A local-first, end-to-end encrypted, peer-to-peer collaborative knowledge workspace with on-device semantic search.

Mycelium is a single-binary application that gives you a personal knowledge workspace — notes, documents, tasks, links, attachments, and structured collections — that lives on your devices, syncs directly between them over the network without any central server, encrypts everything end-to-end, and lets you find anything by meaning rather than by keyword thanks to a language model running on your own machine.

The cloud is optional. Two laptops sitting next to each other sync directly, peer to peer, over QUIC. An optional self-hosted relay can buffer ciphertext when no two devices are simultaneously online — but the system never trusts a third party with your content.

The architecture, the rationale, and the protocols are documented in:

- [`docs/MYCELIUM.md`](docs/MYCELIUM.md) — full technical architecture (stack, supervision tree, CRDT layer, P2P sync, crypto, search, plugins, performance budgets, threat model, roadmap).
- [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) — formal Software Requirements Specification (functional + non-functional requirements, acceptance criteria, governance).

---

## Status

Mycelium is in early implementation. Milestone tracking:

| Milestone | Scope | Status |
|---|---|---|
| **M0 — Walking skeleton** | Single-node app: open, write, save notes locally. Embedded SurrealDB. Lustre block editor. Tauri wrapper. | In progress |
| M1 — Local-first MVP | Loro CRDT integration. Two-node sync over Iroh on LAN. Device key in OS keychain. Ring + QR pairing. | Not started |
| M2 — Search and plugins | fastembed-rs + on-device embeddings. Vector index. WasmEdge plugin sandbox. Three reference plugins. | Not started |
| M3 — Production polish | macOS + Windows release builds. Self-hosted relay. DNS discovery. Op-log compaction. 24-hour soak test. | Not started |
| M4 — 1.0 | External crypto audit. Documentation site. Plugin community index. Signed-delta auto-update. | Not started |

The full milestone breakdown lives in docs/MYCELIUM.md §23.

---

## Stack

The components and the rationale for each choice are in docs/MYCELIUM.md §5 and in `docs/architecture/adr-*.md`. Brief inventory:

- **Gleam** on the **BEAM** — typed functional language compiled to Erlang bytecode; supervision trees + cheap processes.
- **Lustre** — Gleam frontend framework (Elm-style MVU), running in server-component mode over WebSocket.
- **Mist + Wisp** — HTTP/1.1 + WebSocket server and routing for Gleam.
- **Loro** (Rust, M1+) — high-performance rich-text + tree CRDTs, hosted as a sidecar process.
- **Iroh** (Rust, M1+) — QUIC P2P with NAT traversal and content-addressed blob transfer.
- **SurrealDB** embedded — multi-model (document + graph + KV + vector) local store.
- **fastembed-rs / Candle** (M2+) — on-device embedding model (`all-MiniLM-L6-v2`, INT8).
- **WasmEdge** (M2+) — WebAssembly plugin sandbox with capability-based permissions.
- **age + BLAKE3** — modern file encryption + content-addressable hashing.
- **Tauri** — Rust desktop shell hosting the BEAM and the webview.
- **Nix flakes** — reproducible builds (Linux/WSL).

---

## Repository layout

```
.
├── docs/MYCELIUM.md, docs/SPECIFICATION.md   Canonical specs
├── README.md, LICENSE, …           Project metadata
├── flake.nix, justfile, Cargo.toml Build configuration
├── apps/
│   ├── core/         Gleam BEAM application
│   ├── frontend/     Lustre UI compiled to JavaScript
│   ├── cli/          Scripting CLI
│   └── desktop/      Rust Tauri host
├── sidecars/         Rust sidecars (one process per concern)
├── plugins/          Plugin SDK + reference plugins
├── proto/            Protocol contracts (CDDL, WIT, JSON-Schema)
├── docs/             ADRs, protocol specs, threat model
├── infra/            Nix builders, CI workflows, systemd units
└── tests/            Property, integration, load
```

Section 18 of docs/MYCELIUM.md is authoritative.

---

## Development

See [`docs/SETUP.md`](docs/SETUP.md) for one-time toolchain installation (scoop + cargo).

Once the toolchain is installed, from the repository root:

```powershell
just install-deps   # verify toolchain versions
just build          # build sidecars, frontend, core, desktop
just dev            # start the app with hot-reload
just test           # run all tests
just fmt            # format Gleam + Rust
```

The `justfile` is PowerShell-aware on Windows; the same recipes work in bash on Linux/macOS.

---

## Documentation

| Document | Purpose |
|---|---|
| [`docs/MYCELIUM.md`](docs/MYCELIUM.md) | Full technical architecture |
| [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) | Formal SRS (requirements + acceptance criteria) |
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md) | End-user install (download a release) |
| [`docs/SETUP.md`](docs/SETUP.md) | Toolchain install for contributors building from source |
| [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) | Contribution workflow |
| [`.github/SUPPORT.md`](.github/SUPPORT.md) | Where to ask questions, file bugs, propose RFCs |
| [`.github/SECURITY.md`](.github/SECURITY.md) | Vulnerability disclosure policy |
| [`.github/CODE_OF_CONDUCT.md`](.github/CODE_OF_CONDUCT.md) | Contributor Covenant 2.1 |
| [`docs/architecture/`](docs/architecture/) | Architecture Decision Records |
| [`docs/protocols/port.md`](docs/protocols/port.md) | Port-protocol spec (BEAM ↔ sidecars) |
| [`docs/protocols/wire.md`](docs/protocols/wire.md) | Peer wire-protocol spec (M1 draft) |
| [`docs/plugins/contract.md`](docs/plugins/contract.md) | Plugin contract |
| [`docs/plugins/sdk.md`](docs/plugins/sdk.md) | Plugin SDK reference |
| [`docs/threat_model.md`](docs/threat_model.md) | Threat model |

---

## License

The application source is licensed under [**AGPL-3.0-or-later**](LICENSE). The plugin SDK is **MIT** (so plugins may be closed-source). The protocol specifications and other documentation are **CC-BY-4.0**. See [`docs/LICENSES.md`](docs/LICENSES.md) for the full third-party inventory.
