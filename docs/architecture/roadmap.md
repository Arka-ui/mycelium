# Roadmap

This document tracks Mycelium's milestone-by-milestone delivery. It is the operational summary of `../MYCELIUM.md` §23 and `../SPECIFICATION.md` §5/§11.

A milestone is "done" when every Must requirement in its scope passes its CI acceptance test, the corresponding ADRs are merged, the documentation is updated, and the release notes are published.

---

## M0 — Walking skeleton

**Goal:** prove the architecture by booting it end-to-end on one device.

| Item | Source | Status |
|---|---|---|
| Single-node Tauri app launches and opens a webview | `../MYCELIUM.md` §23 | In progress |
| BEAM supervision tree boots cleanly per `../MYCELIUM.md` §7 | §7 | In progress |
| SurrealDB embedded sidecar (`surreal_port`) | ADR-0003, ADR-0006 | In progress |
| Lustre server-component UI with paragraph/heading/bullet blocks | ADR-0007 | In progress |
| Persistence: notes survive restart | FR-NOTES-01/02 | In progress |
| Justfile + PowerShell dev loop on Windows | ../SETUP.md | In progress |
| All ADRs (0001–0012) merged | ADR-0001 | In progress |
| All protocol specs drafted (port, wire, plugin) | §10 deliverables | In progress |
| Threat model document | NFR-SEC-03 | In progress |

The cut line: *if it requires a network packet, a cryptographic key, or a CRDT operation, it is M1+.*

## M1 — Local-first MVP

**Goal:** sync between two devices on a LAN using real CRDTs and ring keys.

| Item | Source |
|---|---|
| Loro CRDT integration (the `loro_port` sidecar replaces the M0 stub) | ADR-0004 |
| Iroh P2P transport (the `iroh_port` sidecar replaces the M0 stub) | ADR-0005 |
| LAN peer discovery via mDNS | FR-SYNC-04 |
| Two-node sync over Iroh on a LAN | FR-SYNC-01 |
| Ed25519 device keys persisted via OS keychain (Windows Credential Manager, macOS Keychain, libsecret) | FR-CRYPTO-01/10 |
| Ring creation + QR pairing flow | FR-CRYPTO-03 |
| SPAKE2 remote pairing | FR-CRYPTO-04 |
| Property tests for CRDT convergence | NFR-MAINT-02 |
| Integration tests with simulated network conditions | §13.2 |
| Every M0 stub Gleam module replaced with the real implementation | — |

## M2 — Search and plugins

**Goal:** the user can search semantically over their own corpus and extend the app with sandboxed plugins.

| Item | Source |
|---|---|
| `fastembed_port` sidecar with `all-MiniLM-L6-v2` (INT8) | FR-SEARCH-01, ADR — TBD |
| Vector index in SurrealDB with HNSW | §12 |
| Hybrid search ranking (semantic + recency + centrality) | FR-SEARCH-03 |
| Lexical fallback search | FR-SEARCH-02 |
| Incremental index updates on content change | FR-SEARCH-05 |
| `wasmedge_port` sidecar | ADR-0010 |
| Capability-based plugin install flow | FR-PLUGIN-02 |
| Three reference plugins working end-to-end (Mermaid, Translate, iCal import) | FR-PLUGIN-10 |
| At-rest encryption (the `age` integration in `surreal_port`) | FR-CRYPTO-07/08 |
| Op-log encryption | FR-CRYPTO-09 |
| Port protocol migrated to CBOR | ADR-0012 |

## M3 — Production polish

**Goal:** distributable on every supported OS, with a relay deployment story.

| Item | Source |
|---|---|
| macOS bundle (.dmg) | FR-DEPLOY-01 |
| Windows installer (.msi + .exe) | FR-DEPLOY-01 |
| Linux packages (.deb, .rpm, .AppImage) | FR-DEPLOY-01 |
| Headless relay binary for Linux x86_64 + arm64 | FR-DEPLOY-03 |
| DNS-based discovery | FR-SYNC-05 |
| Operation log compaction | FR-SYNC-09 |
| Snapshot-based first sync for new devices | FR-SYNC-10 |
| Backpressure on slow peers | FR-SYNC-08 |
| 24-hour soak test green | §11 acceptance |
| GitHub Actions matrix on macOS, Windows, Linux | NFR-PORT-01/02 |
| Sample systemd unit for the relay, tested in CI on a Linux container | FR-DEPLOY-08 |
| Full Nix flake for cross-compilation | ADR-0011 |
| Auto-update via signed deltas | FR-DEPLOY-06 |

## M4 — 1.0

**Goal:** publishable, audit-cleared, and supported.

| Item | Source |
|---|---|
| External cryptography audit complete; all Critical/High findings resolved | NFR-SEC-04 |
| Documentation site published | §10.2 deliverables |
| Plugin community index live | CO-2 |
| Security disclosure process active (`../../.github/SECURITY.md`) | §13.3 |
| Every Must requirement in `../SPECIFICATION.md` §6 passes its CI acceptance test | §11 |
| Every NFR target in §7.1 met on the baseline machine, with results in the release notes | §11 |

## Beyond 1.0 (post-roadmap)

- Mobile clients (Tauri Mobile or native server-component browser app).
- Plugin-defined node kinds with conflict-free schema evolution.
- Differential dataflow for live materialized views.
- Multi-ring devices (one device participating in multiple isolated rings).
- OCR / structured extraction over attachments for indexed search.
- LaTeX math rendering inside the editor.
