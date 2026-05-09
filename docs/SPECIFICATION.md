# Mycelium — Software Requirements Specification

**Document type:** Software Requirements Specification (SRS) / Cahier des Charges
**Version:** 1.0
**Status:** Draft
**Audience:** Project maintainers, contributors, security auditors, plugin authors
**Related documents:** `MYCELIUM.md` (technical documentation)

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Context and rationale](#2-context-and-rationale)
3. [Stakeholders](#3-stakeholders)
4. [Project objectives](#4-project-objectives)
5. [Scope](#5-scope)
6. [Functional requirements](#6-functional-requirements)
7. [Non-functional requirements](#7-non-functional-requirements)
8. [Constraints](#8-constraints)
9. [Assumptions and dependencies](#9-assumptions-and-dependencies)
10. [Deliverables](#10-deliverables)
11. [Acceptance criteria](#11-acceptance-criteria)
12. [Risks and mitigations](#12-risks-and-mitigations)
13. [Quality requirements](#13-quality-requirements)
14. [Compliance and licensing](#14-compliance-and-licensing)
15. [Governance and contribution model](#15-governance-and-contribution-model)
16. [References](#16-references)

---

## 1. Executive summary

Mycelium is a local-first, end-to-end encrypted, peer-to-peer collaborative knowledge workspace. Each participating device runs a complete, self-contained instance of the application: its own runtime, its own database, its own cryptographic identity. Devices owned by the same user (or trusted small team) form a **ring** and synchronize directly over QUIC using CRDT-based replication. Search is performed locally by an on-device language model. No central server is required at any point in the system; an optional self-hosted relay exists only as a store-and-forward buffer for ciphertext when no two devices are simultaneously online.

The project's defining property is the absence of trusted third parties. The user's content is never readable by anyone other than the user's own devices. This property is enforced at the protocol level, not at the policy level.

---

## 2. Context and rationale

The dominant model for productivity software places user data inside vendor-controlled infrastructure. The user trades sovereignty over their content for collaborative features and convenience. This trade has three observable failure modes: forced connectivity (the application is unusable offline), data lock-in (export is technically available but practically lossy), and content access (the vendor reads the content, directly or via integrated AI features).

The local-first software paradigm, articulated in published research and matured through practical CRDT libraries, demonstrates that these trade-offs are not necessary. Mycelium implements the local-first ideals using a niche but principled stack chosen for its specific suitability: the BEAM for concurrency and supervision, Loro for state-of-the-art CRDTs, Iroh for proven peer-to-peer transport, and on-device embedding models for private semantic search.

The project simultaneously serves three purposes:

- A useful product for users who require sovereignty over their personal knowledge graph.
- A reference implementation of local-first principles using a coherent stack.
- A demonstration of engineering breadth: language design, distributed systems, cryptography, machine learning, and operating-system integration coexisting in one codebase.

---

## 3. Stakeholders

| Stakeholder | Role | Primary concerns |
|---|---|---|
| Project owner | Initiates and maintains the project; final architectural authority | Coherence of vision, technical correctness, sustainability |
| End users (individual) | Use Mycelium as a personal knowledge workspace | Reliability, privacy, ease of use, data sovereignty |
| End users (small team) | Use Mycelium for collaborative knowledge work | Real-time collaboration, member management, performance at small team scale |
| Plugin authors | Extend Mycelium via the Wasm plugin system | SDK quality, capability documentation, distribution channel |
| Contributors | Submit code, documentation, translations | Onboarding clarity, contribution process, tooling |
| Security auditors | Review cryptographic and protocol design | Specification completeness, threat model precision, primitive choices |
| Self-hosters | Run a relay node | Operational simplicity, resource footprint, security defaults |

---

## 4. Project objectives

### 4.1 Product objectives

- **PO-1.** Deliver a workspace application that is fully functional with zero network connectivity.
- **PO-2.** Deliver real-time multi-device collaboration without any central server.
- **PO-3.** Deliver semantic search that runs entirely on the user's device.
- **PO-4.** Deliver end-to-end encryption that is the default for all stored and transmitted data.
- **PO-5.** Deliver an extensibility model that lets third-party plugins run safely without compromising user data.

### 4.2 Technical objectives

- **TO-1.** Demonstrate that local-first architecture is viable for non-trivial collaborative applications.
- **TO-2.** Produce a reproducible build pipeline where any third party can verify binary provenance.
- **TO-3.** Produce a stack where every component has been chosen for an articulable engineering reason, documented in Architecture Decision Records.
- **TO-4.** Maintain end-to-end type safety across the full request path, from UI event to storage write.

### 4.3 Community objectives

- **CO-1.** Publish a complete protocol specification permitting independent implementations.
- **CO-2.** Produce a plugin SDK and reference plugins sufficient for a third-party developer to ship a useful plugin without reading the core sources.
- **CO-3.** Maintain transparent decision-making via a public RFC process for non-trivial changes.

---

## 5. Scope

### 5.1 In scope (v1.0)

- Desktop application for macOS, Windows, and Linux on x86_64 and arm64.
- Headless relay binary for Linux x86_64 and arm64.
- Command-line interface for scripting, import, export, and backup.
- Single-user solo topology and small-team topology (up to 20 devices in a ring).
- LAN and WAN peer discovery and synchronization.
- End-to-end encryption of all content at rest and in transit.
- On-device semantic search with at least one embedding model.
- Plugin runtime with capability-based sandboxing.
- Reproducible builds via a Nix flake.

### 5.2 Out of scope (v1.0)

- Mobile applications (iOS, Android).
- Multi-tenant cloud-hosted deployment.
- Real-time collaboration above 20 devices in a single ring.
- Server-rendered web access from arbitrary devices (web access is local-only via the embedded webview).
- Lossless import from proprietary formats (Notion, Confluence, OneNote). Best-effort import only.
- Remote wipe of revoked devices.
- Onion-routed traffic / metadata protection beyond what TLS over QUIC provides.

### 5.3 Deferred (post-1.0)

- Mobile clients via Tauri Mobile or equivalent.
- Plugin-defined node kinds with conflict-free schema evolution.
- Live materialized views via differential dataflow.
- Multi-ring devices (one device participating in multiple isolated rings simultaneously).
- OCR and structured extraction over attachments for indexed search.
- LaTeX math rendering inside the editor.

---

## 6. Functional requirements

Each requirement carries a unique identifier, a priority following the **MoSCoW** convention (**M**ust, **S**hould, **C**ould, **W**on't), and one or more acceptance criteria that are objectively verifiable.

### 6.1 Note and graph management (FR-NOTES)

| ID | Requirement | Priority | Acceptance criterion |
|---|---|---|---|
| FR-NOTES-01 | Create a node of any built-in kind | Must | A new node appears in the graph with a generated ULID and an `updated_at` Lamport timestamp |
| FR-NOTES-02 | Edit the body of a node using a rich-text block editor | Must | Each block-level edit produces a CRDT operation visible in the document op log |
| FR-NOTES-03 | Delete a node with tombstone semantics | Must | Node is invisible in queries; tombstone propagates to peers; undo restores it |
| FR-NOTES-04 | Define typed properties per node kind via a schema | Must | Schema validation rejects writes that violate the declared property types |
| FR-NOTES-05 | Create typed edges between nodes | Must | Edges are listed in source and target nodes; deletion of either endpoint cascades correctly |
| FR-NOTES-06 | Attach binary files to nodes | Must | File is content-addressed by BLAKE3, stored encrypted, and rendered if the type is supported |
| FR-NOTES-07 | Persist saved views as nodes | Should | A view re-runs its query on open and reflects current graph state |
| FR-NOTES-08 | Compute backlinks automatically | Must | Opening a node displays all nodes that reference it within 100 ms |
| FR-NOTES-09 | Undo and redo any node operation | Must | Undo stack covers at least the last 100 operations of the active session |
| FR-NOTES-10 | Bulk operations across multiple nodes | Should | Operations apply atomically per-node and are reversible by undo |

### 6.2 Editor (FR-EDIT)

| ID | Requirement | Priority | Acceptance criterion |
|---|---|---|---|
| FR-EDIT-01 | Provide a WYSIWYG block editor | Must | Visual rendering matches semantic block structure |
| FR-EDIT-02 | Support paragraph, heading 1–4, bullet list, numbered list, todo, code block, quote, divider, callout, table | Must | Each block type can be created, edited, converted, and deleted |
| FR-EDIT-03 | Support inline marks: bold, italic, strikethrough, inline code, highlight, link | Must | Marks toggle correctly under concurrent edits and survive sync |
| FR-EDIT-04 | Provide slash-command insertion menu | Must | Typing `/` opens a menu of block types and registered plugin commands |
| FR-EDIT-05 | Support standard editor keyboard shortcuts | Must | Shortcuts match common conventions on each OS |
| FR-EDIT-06 | Display remote cursors and selections during real-time co-editing | Must | Each peer's cursor position is visible to other peers within the sync latency target |
| FR-EDIT-07 | Drag-and-drop block reordering | Should | Reordering produces correct CRDT moves under concurrent edits |
| FR-EDIT-08 | Inline preview of embedded media (images, video) | Should | Media renders without leaving the editor |
| FR-EDIT-09 | Live-rendered Mermaid and similar plugin-provided block types | Should | Plugin block renderers receive sandboxed input and return safe output |
| FR-EDIT-10 | Math equations via plugin | Could | Deferred to plugin author |

### 6.3 Synchronization (FR-SYNC)

| ID | Requirement | Priority | Acceptance criterion |
|---|---|---|---|
| FR-SYNC-01 | Real-time synchronization between online peers | Must | An edit on peer A is visible on peer B within the sync latency target |
| FR-SYNC-02 | Offline edits replicate on reconnect | Must | An edit performed while offline appears on all online peers within one sync round after reconnect |
| FR-SYNC-03 | Strong eventual consistency | Must | Property tests confirm convergence under all tested operation orderings |
| FR-SYNC-04 | LAN peer discovery | Must | Two devices in the same ring on the same Wi-Fi find each other within 5 s |
| FR-SYNC-05 | WAN peer discovery via DNS | Should | Two devices in different networks find each other via DNS-SD records |
| FR-SYNC-06 | Optional self-hosted relay node | Should | A relay stores ciphertext operations and retransmits them to peers on connection |
| FR-SYNC-07 | Incremental sync via version vectors | Must | Sync transmits only operations the peer has not observed |
| FR-SYNC-08 | Backpressure on slow peers | Must | A slow peer cannot cause memory growth on a fast peer beyond a configured ceiling |
| FR-SYNC-09 | Operation log compaction | Must | Logs older than the stable version vector are replaced by snapshots |
| FR-SYNC-10 | Snapshot-based first sync for new devices | Must | A new device receives a snapshot rather than the full op log when first added to a ring |

### 6.4 Cryptography and identity (FR-CRYPTO)

| ID | Requirement | Priority | Acceptance criterion |
|---|---|---|---|
| FR-CRYPTO-01 | Generate a unique device key pair on first launch | Must | Key pair is Ed25519, stored only in OS keychain |
| FR-CRYPTO-02 | Maintain a signed ring membership log | Must | Every membership change is signed by the ring key and verifiable offline |
| FR-CRYPTO-03 | Pair a new device via QR code with PIN-protected payload | Must | Pairing succeeds only when the PIN displayed on the existing device is entered on the new device |
| FR-CRYPTO-04 | Pair a new device remotely via SPAKE2 password exchange | Should | Off-band passphrase yields a successful key exchange resistant to offline brute force |
| FR-CRYPTO-05 | Revoke a device | Must | Revoked device cannot establish new sync connections; revocation propagates to all peers |
| FR-CRYPTO-06 | Rotate ring data-encryption key on revocation | Must | Future operations are encrypted under the new key; past ops remain readable to peers that already had them |
| FR-CRYPTO-07 | Encrypt local database at rest | Must | Database files are unreadable without the device key |
| FR-CRYPTO-08 | Encrypt attachments at rest | Must | Attachment files are unreadable without the ring data key |
| FR-CRYPTO-09 | End-to-end encrypt operation logs | Must | Operations leaving the device are age-encrypted to ring members |
| FR-CRYPTO-10 | Store device private key in OS keychain | Must | Private key never written to a regular file in plaintext |

### 6.5 Search (FR-SEARCH)

| ID | Requirement | Priority | Acceptance criterion |
|---|---|---|---|
| FR-SEARCH-01 | Local semantic search via on-device embeddings | Must | Query embedding and vector lookup performed entirely without network calls |
| FR-SEARCH-02 | Lexical (keyword) search as fallback | Must | A keyword query returns matching blocks ranked by frequency and recency |
| FR-SEARCH-03 | Hybrid ranking combining semantic, lexical, recency, and centrality signals | Should | Configurable weights with sane defaults |
| FR-SEARCH-04 | Filters by node kind, tag, edge relation, date range | Must | Filters compose with semantic and lexical queries |
| FR-SEARCH-05 | Incremental index updates on content change | Must | Edited blocks are re-embedded within 30 s of save |
| FR-SEARCH-06 | Support multiple embedding models with user choice | Should | At least two models available, switchable from settings |
| FR-SEARCH-07 | Private query history | Could | Queries stored only locally, deletable in one action |
| FR-SEARCH-08 | OCR/extraction over attachments | Won't (v1.0) | Deferred to post-1.0 |

### 6.6 Plugin system (FR-PLUGIN)

| ID | Requirement | Priority | Acceptance criterion |
|---|---|---|---|
| FR-PLUGIN-01 | Run plugins as WebAssembly modules in WasmEdge | Must | Plugin runtime crashes are contained; host process unaffected |
| FR-PLUGIN-02 | Capability-based permission model | Must | A plugin without `network` capability has no network access verified by sandbox tests |
| FR-PLUGIN-03 | Verify plugin signatures before execution | Must | Modified plugin binaries are rejected at install |
| FR-PLUGIN-04 | Subscribe plugins to graph events | Must | Plugin callback fires when subscribed event occurs and not otherwise |
| FR-PLUGIN-05 | Register plugin slash-commands | Must | Plugin command appears in the slash menu and produces the expected output |
| FR-PLUGIN-06 | Custom block renderers | Should | Renderer receives block input, returns sanitized output, output rendered correctly |
| FR-PLUGIN-07 | Per-plugin key-value store, isolated | Must | A plugin cannot read another plugin's KV namespace |
| FR-PLUGIN-08 | Metered HTTP egress through capability | Should | HTTP egress only to user-allowlisted hosts, with rate limits |
| FR-PLUGIN-09 | Plugin SDK and contract documentation | Must | A new contributor can ship a working plugin without reading core sources |
| FR-PLUGIN-10 | Reference plugins shipped: Mermaid renderer, translation, calendar import | Should | Each reference plugin works on every supported platform |

### 6.7 Deployment and packaging (FR-DEPLOY)

| ID | Requirement | Priority | Acceptance criterion |
|---|---|---|---|
| FR-DEPLOY-01 | Single redistributable artifact per platform | Must | One installer per platform (.dmg, .msi/.exe, .deb/.rpm/.AppImage) |
| FR-DEPLOY-02 | Tauri-wrapped desktop application | Must | Desktop application runs as a native window with native menus |
| FR-DEPLOY-03 | Headless relay binary | Must | Single binary executable on Linux x86_64 and arm64 |
| FR-DEPLOY-04 | Reproducible build via Nix flake | Should (Must by v1.0; tracked for M3) | Two builds of the same commit produce byte-identical binaries. Until M3 the flake provides only a `nix develop` shell; the per-platform build outputs ship with the production-polish milestone. |
| FR-DEPLOY-04b | Native-toolchain build path is documented and reproducible per OS | Must | Each supported host has a documented toolchain (Windows: PowerShell + scoop; Linux/macOS: native package manager or `nix develop`). Pinned versions live in `SETUP.md`. |
| FR-DEPLOY-05 | Cross-compilation from any supported host | Should | Linux host produces macOS and Windows artifacts |
| FR-DEPLOY-06 | Auto-update via signed deltas | Should | Updates downloaded, verified, and applied without user manual action |
| FR-DEPLOY-07 | First-run setup wizard | Must | New user reaches a usable workspace in five steps or fewer |
| FR-DEPLOY-08 | Sample systemd unit for relay | Should | Provided in `infra/` and tested in CI on a Linux container |

### 6.8 Command-line interface (FR-CLI)

| ID | Requirement | Priority | Acceptance criterion |
|---|---|---|---|
| FR-CLI-01 | Headless CLI binary | Must | CLI runs without graphical environment |
| FR-CLI-02 | Import from Markdown and JSON | Must | Imported content appears in the workspace with structure preserved |
| FR-CLI-03 | Export to Markdown and JSON | Must | Exported content is byte-stable across runs given identical state |
| FR-CLI-04 | Backup the encrypted database to a single archive | Must | Backup can be restored on the same device or transferred to another |
| FR-CLI-05 | Pipe-friendly machine-readable output (JSON, NDJSON) | Should | Each command supports `--format json` |
| FR-CLI-06 | Plugin install and removal via CLI | Should | Plugin lifecycle parity with the GUI |
| FR-CLI-07 | Run a query and emit results | Should | Vector and graph queries usable from scripts |

---

## 7. Non-functional requirements

### 7.1 Performance (NFR-PERF)

Targets are validated on a baseline machine: Apple M1, 8 cores, 16 GB RAM, NVMe SSD, on macOS. Equivalent x86_64 Linux baselines are documented in benchmark fixtures.

| ID | Metric | Target |
|---|---|---|
| NFR-PERF-01 | Cold start (process launch to first interactive paint) | ≤ 1.2 s |
| NFR-PERF-02 | Keystroke latency (event to DOM update) | ≤ 16 ms |
| NFR-PERF-03 | Search query latency over 100,000 indexed blocks | ≤ 200 ms p95 |
| NFR-PERF-04 | LAN sync latency per operation, end-to-end | ≤ 80 ms |
| NFR-PERF-05 | WAN hole-punched sync latency per operation | ≤ 250 ms p95 |
| NFR-PERF-06 | Memory at idle, 10,000 blocks loaded | ≤ 250 MB resident |
| NFR-PERF-07 | Memory under load, 100,000 blocks indexed and searchable | ≤ 800 MB resident |
| NFR-PERF-08 | Disk overhead vs. raw text size | ≤ 4× |
| NFR-PERF-09 | Cold sync of 100,000-block ring on LAN | ≤ 90 s |
| NFR-PERF-10 | Indexing throughput during bulk ingest | ≥ 200 blocks/s on baseline machine |

Performance regressions of more than 10 % on any tracked metric must block merge in CI.

### 7.2 Security (NFR-SEC)

| ID | Requirement |
|---|---|
| NFR-SEC-01 | All cryptographic primitives are standardized and widely implemented: Ed25519, X25519, ChaCha20-Poly1305, BLAKE3, age, TLS 1.3 over QUIC |
| NFR-SEC-02 | No private key, ring key, or plaintext data persists to disk in unencrypted form |
| NFR-SEC-03 | A documented threat model exists, identifying defended and undefended attack classes |
| NFR-SEC-04 | An external cryptographic audit is completed before the 1.0 release |
| NFR-SEC-05 | Dependency vulnerability scanning runs on every CI pipeline; severe vulnerabilities block merge |
| NFR-SEC-06 | Reproducible builds permit third-party verification of distributed binaries |
| NFR-SEC-07 | Memory-safe languages (Gleam, Rust) for all components; no C or C++ in first-party code |

### 7.3 Privacy (NFR-PRIV)

| ID | Requirement |
|---|---|
| NFR-PRIV-01 | No telemetry, analytics, or tracking is collected by default |
| NFR-PRIV-02 | Any optional telemetry is opt-in, aggregated, anonymized, and documented |
| NFR-PRIV-03 | No third-party network calls occur without explicit user action |
| NFR-PRIV-04 | The semantic search model runs on the device; no cloud LLM is integrated |
| NFR-PRIV-05 | User content never transits a third party in plaintext, including the optional relay |
| NFR-PRIV-06 | The user can export the entirety of their data in an open format at any time |

### 7.4 Reliability and availability (NFR-AVAIL)

| ID | Requirement |
|---|---|
| NFR-AVAIL-01 | Full application functionality is available offline, except multi-device sync |
| NFR-AVAIL-02 | Unexpected shutdown causes no data loss for operations acknowledged as written |
| NFR-AVAIL-03 | A sidecar crash is isolated; the BEAM auto-restarts the sidecar; document processes resume |
| NFR-AVAIL-04 | Database integrity check runs on startup and refuses to start on corruption |
| NFR-AVAIL-05 | All writes use atomic semantics: WAL or file rename, never partial overwrites |
| NFR-AVAIL-06 | A stuck sidecar is detected via heartbeat and restarted within 5 s |

### 7.5 Usability (NFR-USA)

| ID | Requirement |
|---|---|
| NFR-USA-01 | First-run setup completes in five steps or fewer for the solo topology |
| NFR-USA-02 | Every primary action is reachable from a keyboard shortcut |
| NFR-USA-03 | Defaults are chosen so that a user who never opens settings has a reasonable experience |
| NFR-USA-04 | Error messages identify the cause and suggest at least one corrective action |
| NFR-USA-05 | An onboarding tutorial introduces the editor, search, and sync within 5 minutes of use |

### 7.6 Maintainability (NFR-MAINT)

| ID | Requirement |
|---|---|
| NFR-MAINT-01 | Test coverage ≥ 85 % for Gleam code, ≥ 75 % for Rust sidecars |
| NFR-MAINT-02 | Property-based tests cover CRDT convergence invariants under adversarial operation orderings |
| NFR-MAINT-03 | Architecture Decision Records are written for every significant architectural choice |
| NFR-MAINT-04 | Public API contracts (port protocol, wire protocol, plugin contract) are versioned |
| NFR-MAINT-05 | Code style is enforced by automated formatters; non-conforming code blocks merge |
| NFR-MAINT-06 | All public APIs have inline documentation generated into a published reference |

### 7.7 Portability (NFR-PORT)

| ID | Requirement |
|---|---|
| NFR-PORT-01 | macOS 12 or later, Windows 10 or later, major Linux distributions |
| NFR-PORT-02 | x86_64 and arm64 supported on every target OS |
| NFR-PORT-03 | A single source tree produces all platform artifacts. The Nix flake is the unified path on Linux/macOS; native toolchains (scoop on Windows) are the parallel path until the flake reaches feature parity at M3. |
| NFR-PORT-04 | Platform-specific code is isolated in dedicated modules; the application core is platform-neutral |

### 7.8 Localization (NFR-LOC)

| ID | Requirement |
|---|---|
| NFR-LOC-01 | An i18n framework is integrated from the first release |
| NFR-LOC-02 | English is shipped at v1.0 |
| NFR-LOC-03 | At least one community-translated language is shipped at v1.1 |
| NFR-LOC-04 | Right-to-left layout support is deferred to post-1.0 but not architecturally precluded |

### 7.9 Accessibility (NFR-A11Y)

| ID | Requirement |
|---|---|
| NFR-A11Y-01 | The UI targets WCAG 2.2 Level AA conformance |
| NFR-A11Y-02 | Screen-reader compatibility is verified on each supported OS |
| NFR-A11Y-03 | All workflows are completable via keyboard alone |
| NFR-A11Y-04 | A high-contrast theme ships at v1.0 |

---

## 8. Constraints

| ID | Constraint |
|---|---|
| C-01 | The technology stack defined in `MYCELIUM.md` is binding for v1.0; substitutions require an Architecture Decision Record |
| C-02 | The system imposes no required cloud service on the end user |
| C-03 | The build pipeline is reproducible from source: no `curl pipe shell`, no unpinned binary downloads |
| C-04 | All dependencies must be redistributable under licenses compatible with AGPL-3.0 |
| C-05 | The project is initially developed by a small team; design decisions privilege clarity and contributor-onboarding cost over micro-optimization |
| C-06 | The relay node imposes a maximum resident memory footprint of 100 MB at idle for one ring |
| C-07 | No first-party code is written in C or C++ |

---

## 9. Assumptions and dependencies

### 9.1 Assumptions

- Users own at least one device on which they have rights to install software.
- Users have intermittent internet connectivity. The system is designed to be useful even when this assumption fails, but periodic connectivity is required for multi-device sync.
- The OS provides a working keychain or credential store accessible to the application.
- For LAN discovery to function, at least one router on the local network permits multicast traffic.

### 9.2 Upstream dependencies

The project depends on the continued maintenance of the following upstream components. A vendoring or fork strategy is documented for each.

| Component | Risk if abandoned | Mitigation |
|---|---|---|
| Erlang/OTP, BEAM | Low; mature, multi-vendor, broad institutional usage | None required |
| Gleam | Medium; small but active ecosystem | Vendored compiler in Nix flake; team familiar with raw Erlang as fallback |
| Lustre | Medium; small ecosystem | Vendored, fork acceptable; alternative: Phoenix LiveView via Elixir interop |
| Loro | Medium; project is young but active | Operation log format is a stable serialization; alternative CRDT engines (Yjs, Automerge) exist with similar primitives |
| Iroh | Medium; project is young but well-funded and active | Wire format is QUIC + custom protocol; alternative: libp2p, raw QUIC |
| SurrealDB | Low to medium; commercial backer, active development | Embedded mode is a documented use case; alternative: SQLite + custom indexes |
| Candle / fastembed-rs | Low to medium; ML ecosystem is fast-moving | Alternative ONNX Runtime with the same models |
| WasmEdge | Medium; active project, CNCF-incubated | Alternative: Wasmtime, with comparable WASI support |
| Tauri | Low; large community, Rust-native | Alternative: Wails, Electron with Rust sidecar |
| Nix | Low; mature, broad usage | None required |
| age | Low; specification stable, multiple implementations | None required |
| BLAKE3 | Low; specification stable, multiple implementations | None required |

---

## 10. Deliverables

### 10.1 Software artifacts

- A Git repository containing all source code, build configuration, documentation, and tests.
- Per-platform build artifacts published for each release: macOS `.dmg`, Windows installer, Linux `.deb`, `.rpm`, `.AppImage`, headless relay binary for Linux x86_64 and arm64.
- A signed manifest file accompanying each release, providing BLAKE3 hashes of every artifact.

### 10.2 Documentation

- The technical documentation (`MYCELIUM.md`) covering architecture, data model, protocols, and operations.
- This Software Requirements Specification.
- A wire-protocol specification (`docs/protocols/wire.md`) precise enough to permit independent implementations.
- A port-protocol specification (`docs/protocols/port.md`) for first-party sidecars.
- A plugin SDK reference (`docs/plugins/sdk.md`) and contract specification (`docs/plugins/contract.md`).
- A threat model document (`docs/threat_model.md`).
- A contributor guide (`docs/contributing.md`).
- Architecture Decision Records (`docs/architecture/adr-*.md`).

### 10.3 Plugin SDK and reference plugins

- A Rust crate for plugin authors targeting `wasm32-wasi`.
- Reference plugins demonstrating the three primary integration patterns (hook, command, renderer).

### 10.4 Operational artifacts

- A sample systemd unit for the relay node.
- A sample Nix module for the relay node.
- Example configuration files annotated with every option.

---

## 11. Acceptance criteria

The 1.0 release is accepted when **all** of the following are simultaneously true:

- Every requirement marked **Must** in Section 6 is implemented and passes its acceptance criterion in CI.
- Every target in Section 7.1 (Performance) is met on the baseline machine, with results published in the release notes.
- The external cryptographic audit identified in NFR-SEC-04 is complete; all findings rated Critical or High are resolved.
- The Nix flake produces byte-identical artifacts on two independent build hosts.
- The threat model document (NFR-SEC-03) has been reviewed and signed off by at least one external security reviewer.
- At least three reference plugins are functional on every supported platform.
- The complete protocol specifications (Sections 10.2 — wire, port, plugin) are published and have received review from at least one external reviewer competent in distributed-systems protocol design.
- All public-facing documentation listed in Section 10.2 is published and complete.
- Test coverage targets in NFR-MAINT-01 are met.
- The 24-hour soak test described in the technical documentation runs to completion with zero data loss and zero unhandled crashes.

---

## 12. Risks and mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Niche stack discourages contributors | High | Medium | Comprehensive ADRs, contributor onboarding doc, "good first issue" labels, video walkthrough of supervision tree |
| R-02 | Hole-punching fails in restrictive corporate or carrier networks | Medium | Medium | Relay fallback (FR-SYNC-06); document network requirements in installation guide |
| R-03 | Local embedding model exceeds resource budget on low-end hardware | Medium | Medium | Offer multiple model sizes (FR-SEARCH-06); allow disabling semantic search |
| R-04 | CRDT convergence bug causes silent state divergence | Low | High | Extensive property-based tests (NFR-MAINT-02); operation log replay tooling; deterministic simulator |
| R-05 | Loro upstream stalls or breaks API | Low | Medium | Pin specific version in Nix flake; preserve forking option; document operation-log format independently |
| R-06 | Tauri behaves inconsistently across operating systems | Medium | Medium | Per-OS E2E tests in CI matrix; community testing program prior to 1.0 |
| R-07 | Cryptographic vulnerability is discovered post-release | Low | High | Conservative primitive choice (NFR-SEC-01); audit before 1.0 (NFR-SEC-04); rapid security-patch process documented |
| R-08 | Plugin ecosystem fails to attract third-party authors | Medium | Low | Quality reference plugins; plugin SDK with examples; documented monetization options for plugin authors |
| R-09 | Reproducibility breaks due to non-deterministic tooling | Medium | Medium | Reproducibility check in CI on every commit; binary cache for contributor convenience |
| R-10 | Concurrent maintainer departure stalls the project | Low | High | All decisions documented in ADRs; bus factor explicitly tracked; RFC process for non-trivial changes ensures distributed knowledge |
| R-11 | Legal challenge to peer-to-peer distribution in some jurisdictions | Low | Medium | Cryptography uses widely-deployed standardized primitives; license is AGPL-3.0; users self-host their relays |
| R-12 | A widely-trusted upstream (e.g., a CA, a discovery DNS host) becomes hostile or unavailable | Low | Low | Discovery is pluggable (mDNS, DNS-SD, gossip); no certificate-authority dependency in the cryptographic model |

---

## 13. Quality requirements

### 13.1 Code quality

- All Gleam code is formatted by the official Gleam formatter; CI rejects unformatted code.
- All Rust code is formatted by `rustfmt` with project configuration; CI rejects unformatted code.
- All Rust code passes `clippy --deny warnings` on the project's lint profile.
- Public functions and types in Gleam are documented with at least a one-line comment.
- Public functions and types in Rust have rustdoc comments rendered into the published API reference.

### 13.2 Test quality

- Every Must requirement has at least one automated test verifying its acceptance criterion.
- Property-based tests for the CRDT layer run with a minimum of 1,000 generated cases per CI run.
- Integration tests spin up at least three simulated peer nodes and verify convergence under randomized network conditions.
- The 24-hour soak test runs at minimum weekly in CI, with results archived.

### 13.3 Review quality

- Every change to a security-sensitive module (cryptography, sandbox, sync protocol) requires review by at least two maintainers.
- Every architectural change requires an ADR, reviewed and merged before implementation begins.
- Every new dependency requires a justification in the relevant ADR.

---

## 14. Compliance and licensing

### 14.1 Licensing

- The application source code is licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.
- The plugin SDK source code is licensed under the **MIT License**, to permit closed-source plugins.
- The protocol specifications, threat model, and other documentation are licensed under the **Creative Commons Attribution 4.0 International License (CC-BY-4.0)**.
- The reference plugins are individually licensed and clearly labeled.

### 14.2 Third-party licenses

- All third-party dependencies are reviewed for license compatibility with AGPL-3.0 before inclusion.
- A `LICENSES.md` file enumerates every dependency and its license.
- Dependencies under copyleft licenses incompatible with AGPL-3.0 are forbidden in the application core; in plugins, the plugin author bears responsibility.

### 14.3 Data protection

- The system architecturally satisfies GDPR's data-portability and right-to-erasure principles: the user holds their data, can export it, and can delete it.
- The system makes no third-party data transfers of user content; therefore, no Standard Contractual Clauses or equivalent transfer mechanisms are required.
- Optional telemetry, if introduced, will be configured with explicit consent and documented in a privacy notice.

### 14.4 Cryptographic export

- The cryptographic primitives used (Ed25519, X25519, ChaCha20-Poly1305, BLAKE3) are standardized and widely deployed.
- No primitive used is subject to export controls beyond standard open-source software exemptions in the relevant jurisdictions.
- The application self-classifies under the standard exception for publicly available cryptographic source code.

---

## 15. Governance and contribution model

### 15.1 Maintainership

- The project is led by an identified maintainer or maintainer team, listed in `MAINTAINERS.md`.
- Maintainer roles, responsibilities, and addition/removal procedures are documented.

### 15.2 Decision-making

- Trivial changes (typos, single-line bug fixes, documentation polish) follow standard pull-request review.
- Substantive changes (new features, protocol changes, dependency additions) follow an RFC process. An RFC is a Markdown document submitted as a pull request to `docs/rfc/`, discussed publicly, and accepted or rejected by the maintainers.
- Breaking changes to public APIs require a deprecation period of at least one minor release.

### 15.3 Communication

- All project discussion occurs in publicly archived channels.
- Security disclosures follow a private channel documented in `../.github/SECURITY.md`, with a 90-day default disclosure window.

### 15.4 Code of Conduct

- The project adopts the Contributor Covenant. Violations are addressed by the maintainers per the procedures documented in `../.github/CODE_OF_CONDUCT.md`.

---

## 16. References

| Reference | Document |
|---|---|
| Technical documentation | `MYCELIUM.md` |
| Wire protocol specification | `docs/protocols/wire.md` (to be authored) |
| Port protocol specification | `docs/protocols/port.md` (to be authored) |
| Plugin contract | `docs/plugins/contract.md` (to be authored) |
| Threat model | `docs/threat_model.md` (to be authored) |
| Contributor guide | `docs/contributing.md` (to be authored) |
| Architecture Decision Records | `docs/architecture/adr-*.md` (to be authored) |
| License | `LICENSE` |
| Maintainers | `MAINTAINERS.md` |
| Code of Conduct | `../.github/CODE_OF_CONDUCT.md` |
| Security policy | `../.github/SECURITY.md` |

---

*End of Software Requirements Specification, version 1.0, draft.*
