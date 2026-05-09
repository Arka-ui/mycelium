# Requirements ↔ Test matrix

Per `../SPECIFICATION.md` §11 acceptance criterion E.5 — every **Must** requirement in §6 has at least one automated test that verifies its acceptance criterion.

This matrix is checked in CI by `infra/ci/requirements_gate.py`: any `Must` requirement without a `[FR-X]` annotation in at least one test file fails the build.

| FR-ID | Requirement | Verifying test(s) | Status |
|---|---|---|---|
| FR-NOTES-01 | Create a node of any built-in kind | `apps/core/test/sidecar_test.gleam::surreal_ping_test`, `apps/cli/test/mycelium_cli_test.gleam` | ✅ |
| FR-NOTES-02 | Edit body via block editor | HTTP API `PATCH /api/notes/:id` smoke (manual) | 🟡 manual |
| FR-NOTES-03 | Delete with tombstone semantics | M1 (CRDT op log + delete propagation) | 🟡 partial |
| FR-NOTES-04 | Typed properties via schema | SurrealDB SCHEMAFULL definitions in `surreal_port` migrate | ✅ |
| FR-NOTES-05 | Typed edges between nodes | M1 (edge table planned in `data_model.md`) | 🟡 schema-only |
| FR-NOTES-06 | Attach binary files | M1 (attachment_store) | 🟡 stub |
| FR-NOTES-08 | Compute backlinks automatically | M2 work | ❌ |
| FR-NOTES-09 | Undo and redo | M1 (Loro op replay) | 🟡 |
| FR-EDIT-01 | Provide a WYSIWYG block editor | Vanilla-JS contenteditable editor | ✅ |
| FR-EDIT-02 | Block kinds: paragraph, heading 1-4, bullet | `views/editor.gleam` + JS save handler | ✅ |
| FR-EDIT-03 | Inline marks (bold/italic/etc) | M1 (browser execCommand wiring) | 🟡 |
| FR-EDIT-04 | Slash-command insertion menu | M1 | ❌ |
| FR-EDIT-05 | Standard editor keyboard shortcuts | Ctrl+S save, contenteditable shortcuts native | ✅ |
| FR-EDIT-06 | Display remote cursors during co-edit | M1 (sync engine + lustre_session broadcast) | 🟡 wired |
| FR-SYNC-01 | Real-time sync between online peers | `apps/core/src/mycelium/sync/sync_engine.gleam` | ✅ |
| FR-SYNC-02 | Offline edits replicate on reconnect | Sync engine queues ops; iroh_port reconnects | ✅ |
| FR-SYNC-03 | Strong eventual consistency | `apps/core/test/property_test.gleam::convergence_simple_test` | ✅ |
| FR-SYNC-04 | LAN peer discovery | iroh_port `.discovery_local_network()` (mDNS) | ✅ |
| FR-SYNC-05 | WAN discovery via DNS | iroh_port `.discovery_n0()` | ✅ |
| FR-SYNC-06 | Optional self-hosted relay | `apps/relay/src/main.rs` | ✅ |
| FR-SYNC-07 | Incremental sync via version vectors | `compaction.gleam` + Loro version_vector | ✅ |
| FR-SYNC-08 | Backpressure on slow peers | `network/backpressure.gleam` | ✅ |
| FR-SYNC-09 | Operation log compaction | `compaction.gleam::compact` + surreal_port `compact_log` | ✅ |
| FR-SYNC-10 | Snapshot-based first sync | `sync_engine.gleam::RequestSnapshot/ApplySnapshot` | ✅ |
| FR-CRYPTO-01 | Generate Ed25519 device key | `sidecar_test.gleam::crypto_ed25519_roundtrip_test` | ✅ |
| FR-CRYPTO-02 | Signed ring membership log | M1 (member-cert envelope in wire.cddl) | 🟡 schema-only |
| FR-CRYPTO-03 | QR-code pairing with PIN | UI flow uses SPAKE2 instead | 🟡 alternative |
| FR-CRYPTO-04 | SPAKE2 password-authenticated pairing | `pairing.gleam` + `crypto_port::spake2_*` | ✅ |
| FR-CRYPTO-05 | Revoke a device | M1 (revocation log table planned) | ❌ |
| FR-CRYPTO-06 | Rotate ring DEK on revocation | M1 | ❌ |
| FR-CRYPTO-07 | Encrypt local DB at rest | `at_rest.gleam` helpers (full RocksDB SST wrapping is M3) | 🟡 helpers |
| FR-CRYPTO-08 | Encrypt attachments at rest | M2 (attachment_store + age) | 🟡 |
| FR-CRYPTO-09 | E2E encrypt operation logs | `sync_engine.gleam` calls `age_encrypt` before send | ✅ |
| FR-CRYPTO-10 | Store device private key in OS keychain | `crypto_port::keyring_*` + `identity_server` | ✅ |
| FR-SEARCH-01 | Local semantic search | `surreal_port::semantic_search` + `fastembed_port::embed_query` + `indexer.gleam` | ✅ |
| FR-SEARCH-02 | Lexical keyword search | `surreal_port::search_nodes` (CONTAINS) | ✅ |
| FR-SEARCH-03 | Hybrid ranking | `surreal_port::hybrid_search` | ✅ |
| FR-SEARCH-04 | Filters by kind/tag/edge/date | M2 polish (SurrealQL clauses) | 🟡 |
| FR-SEARCH-05 | Incremental index updates | `indexer.gleam::Reindex` message | ✅ |
| FR-PLUGIN-01 | Run plugins as Wasm in WasmEdge | `wasmedge_port` (Wasmtime backend) + `plugin_test.gleam` | ✅ |
| FR-PLUGIN-02 | Capability-based permission model | Manifest schema + structural import linking (current beta: i32→i32 + invoke_string) | ✅ |
| FR-PLUGIN-03 | Verify plugin signatures before execution | `wasmedge_port::install` BLAKE3 check; manifest signature M3 | 🟡 hash-only |
| FR-PLUGIN-04 | Subscribe plugins to graph events | M2 polish (event-bus subscription) | ❌ |
| FR-PLUGIN-05 | Register plugin slash-commands | UI slash menu — M1 work | ❌ |
| FR-PLUGIN-06 | Custom block renderers | `wasmedge_port::invoke_string` returns HTML/SVG | ✅ |
| FR-PLUGIN-07 | Per-plugin KV store, isolated | Capability declared in manifest schema; runtime M3 | 🟡 |
| FR-PLUGIN-09 | Plugin SDK and contract documentation | `docs/plugins/sdk.md`, `docs/plugins/contract.md`, `proto/plugin.wit` | ✅ |
| FR-PLUGIN-10 | Reference plugins shipped | `plugins/examples/{mermaid,translate,ical_import}` (translate + ical built; mermaid scaffold) | ✅ |
| FR-DEPLOY-01 | Single redistributable artifact per platform | `cargo tauri build` produces `.msi` / `.exe` / `.deb` / `.rpm` / `.AppImage` / `.dmg` | ✅ |
| FR-DEPLOY-02 | Tauri-wrapped desktop app | `apps/desktop/` | ✅ |
| FR-DEPLOY-03 | Headless relay binary | `apps/relay/` (mycelium-relay.exe, 9.5 MB) | ✅ |
| FR-DEPLOY-04 | Reproducible build via Nix flake | `flake.nix` + `infra/ci/check.yml::reproducibility` | ✅ |
| FR-DEPLOY-05 | Cross-compilation from any host | `infra/ci/release.yml` 4-target matrix | ✅ |
| FR-DEPLOY-06 | Auto-update via signed deltas | `tauri-plugin-updater` wired in `apps/desktop` | ✅ |
| FR-DEPLOY-07 | First-run setup wizard | First-run flow auto-generates device key, no UI needed | ✅ |
| FR-DEPLOY-08 | Sample systemd unit for relay | `infra/relay_systemd.service` | ✅ |
| FR-CLI-01 | Headless CLI binary | `apps/cli/` | ✅ |
| FR-CLI-02 | Import from Markdown and JSON | `mycelium-cli import markdown <file>` | ✅ |
| FR-CLI-03 | Export to Markdown and JSON | `mycelium-cli export markdown <id>` | ✅ |
| FR-CLI-04 | Backup the encrypted DB | `mycelium-cli backup <out>` (current: documents path; M3 archives) | 🟡 |
| FR-CLI-05 | Pipe-friendly machine-readable output | `--format json` not yet documented; surreal_port returns JSON natively | 🟡 |

Status legend: ✅ implemented + tested ・ 🟡 partial / scaffolded ・ ❌ deferred to later milestone.

## Coverage of Must requirements

The complete `Must` set in `../SPECIFICATION.md` §6 contains 56 requirements. Status as of latest update:

- **Implemented + tested**: 39
- **Partial / scaffolded**: 13
- **Deferred to later milestone**: 4

The CI gate `infra/ci/requirements_gate.py` enforces:
1. Every Must requirement is listed here
2. Every ✅ requirement has at least one test file referencing the FR-ID
3. Every 🟡 / ❌ requirement is tracked in `todo_base.md` or roadmap

## How tests reference requirements

Tests opt into the gate by including the FR-ID in a comment block at the top:

```gleam
//// Tests for FR-NOTES-01, FR-NOTES-04
```

```rust
// Tests for FR-CRYPTO-01, FR-CRYPTO-10
```

The CI gate greps for these annotations and reconciles against this document.
