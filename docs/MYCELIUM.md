# Mycelium

> A local-first, end-to-end encrypted, peer-to-peer collaborative knowledge workspace with on-device semantic search.

---

## Table of contents

1. [What Mycelium is](#1-what-mycelium-is)
2. [Why it exists — the problem](#2-why-it-exists--the-problem)
3. [Design philosophy](#3-design-philosophy)
4. [Goals and non-goals](#4-goals-and-non-goals)
5. [The stack, in detail](#5-the-stack-in-detail)
6. [System architecture](#6-system-architecture)
7. [Process model on the BEAM](#7-process-model-on-the-beam)
8. [Data model](#8-data-model)
9. [The CRDT layer](#9-the-crdt-layer)
10. [The peer-to-peer sync layer](#10-the-peer-to-peer-sync-layer)
11. [The cryptographic model](#11-the-cryptographic-model)
12. [The local semantic search engine](#12-the-local-semantic-search-engine)
13. [Storage layer](#13-storage-layer)
14. [The plugin system](#14-the-plugin-system)
15. [Frontend architecture](#15-frontend-architecture)
16. [Deployment topologies](#16-deployment-topologies)
17. [Build system and reproducibility](#17-build-system-and-reproducibility)
18. [Repository layout](#18-repository-layout)
19. [Development workflow](#19-development-workflow)
20. [Testing strategy](#20-testing-strategy)
21. [Performance and resource budget](#21-performance-and-resource-budget)
22. [Threat model](#22-threat-model)
23. [Roadmap](#23-roadmap)
24. [Glossary](#24-glossary)

---

## 1. What Mycelium is

Mycelium is a single-binary application that gives you a personal knowledge workspace — notes, documents, tasks, links, attachments, and structured collections — that lives on your devices, syncs directly between them over the network without any central server, encrypts everything end-to-end, and lets you find anything by meaning rather than by keyword thanks to a language model running on your own machine.

Think of it as if you took the most useful surface of Notion, the offline-first nature of Obsidian, the real-time collaboration of Google Docs, the privacy guarantees of Signal, and the search experience of an LLM-powered assistant — and then removed the cloud. The cloud is optional in Mycelium. You can run a small relay node yourself if your devices are rarely online at the same time, but the system is designed so that two laptops sitting next to each other will sync directly, peer to peer, without any third party ever seeing the data.

The name comes from the underground network of fungal threads that connects trees in a forest: invisible, decentralized, resilient, and built for exchange.

---

## 2. Why it exists — the problem

Modern productivity tools have converged on a model that is hostile to users in three specific ways.

**They require permanent connectivity.** Notion, Linear, Asana, Confluence, and most successors are unusable offline. The "offline mode" they advertise is, in practice, a degraded read-only cache that loses changes the moment a sync conflict appears. This is not a bug — it is the consequence of a server-authoritative architecture where every mutation is a round-trip to a database in someone else's data center.

**They lock your data inside someone else's infrastructure.** Even when an export is technically available, the export is lossy: links break, embeds disappear, custom blocks degrade to plain text. You do not own your knowledge graph; you rent access to it.

**They read your content.** Every keystroke transits servers in plaintext (TLS protects the wire, not the storage). LLM features in these tools send your private notes to third-party APIs. There is no end-to-end encryption because end-to-end encryption is incompatible with a server that needs to index, search, and process your data.

Mycelium is the response to all three. It is offline-first by construction, owns nothing of yours that you cannot export byte-for-byte at any moment, and never sees your content because the server, when there is one, only sees ciphertext.

The local-first software movement, articulated by Ink & Switch researchers in 2019, laid out the seven ideals such an application should satisfy: no spinners, your work is not trapped on one device, the network is optional, seamless collaboration, the long now (your data outlives the company), security and privacy by default, and you retain ultimate ownership and control. Mycelium aims to satisfy all seven.

---

## 3. Design philosophy

Three principles shape every technical decision in the project.

**The cloud is a feature, not the foundation.** The application must work entirely offline, on a single device, with full functionality except multi-device sync. Every feature that depends on the network must degrade gracefully when the network disappears. This is the inverse of the standard SaaS model, where the network is the foundation and offline is the degraded mode.

**Cryptography is the default, not an opt-in.** There is no "encrypted notes" toggle because every note is encrypted. There is no "private workspace" plan because every workspace is private. Encryption keys never leave the user's devices. The system has no concept of a server-side decryption capability.

**Niche stack, considered choices.** Each piece of the stack was chosen for a specific technical reason, not for novelty. The BEAM gives us free fault tolerance and concurrency. Gleam gives us the type safety BEAM lacks. Loro gives us the fastest CRDT runtime. Iroh gives us proven NAT traversal. The combination is rare because the people who care about all five concerns simultaneously are rare — but the combination is not arbitrary.

---

## 4. Goals and non-goals

### Goals

- A workspace where notes, tasks, documents, and structured records share the same data model and can reference each other freely.
- Real-time collaborative editing for users who are simultaneously online, with deterministic merge for users who are not.
- Multi-device sync that works without any user-managed account on a third-party service.
- End-to-end encryption with forward secrecy on the wire and at-rest encryption of the local database.
- Sub-200ms semantic search over a 100k-note corpus on a laptop, with queries never leaving the device.
- A plugin system that lets users extend the application with sandboxed code in any language that targets WebAssembly.
- A single redistributable artifact per platform (one .app, one .exe, one .deb, one binary for Linux servers).
- Reproducible builds: anyone with the source and a Nix installation reproduces the exact same binary, byte-for-byte.

### Non-goals

- Server-rendered web access from arbitrary devices. Mycelium is a native app that you install. The web frontend served by the local node is for the local node only.
- Multi-tenant SaaS. The optional relay component is single-tenant: one user, one or more devices, one relay. There is no shared cloud.
- Real-time collaboration above the scale of a small team (≤ 20 devices in one ring). The CRDT memory profile and the P2P fan-out are optimized for personal and small-team use.
- Compatibility with proprietary block formats from other tools (Notion blocks, Confluence macros, etc.). Import is best-effort and lossy by design.
- Mobile applications in the first release. The architecture supports mobile (the BEAM runs on mobile via AtomVM-class runtimes, and Tauri Mobile is maturing) but the initial target is desktop and headless server.

---

## 5. The stack, in detail

Each entry below explains what the technology is, what role it plays in Mycelium, and why it was picked over alternatives.

### Gleam

A statically-typed, immutable, functional programming language that compiles to Erlang bytecode (BEAM) and to JavaScript. Gleam looks like a cousin of Rust or OCaml at the syntax level but produces processes, supervision trees, and message-passing code under the hood, exactly like Erlang or Elixir. Its type system is sound, its compiler is fast, and the language itself is small enough that the entire reference fits on a poster.

In Mycelium, Gleam is the primary application language. The HTTP layer, the websocket layer, the supervision logic, the document orchestration, the synchronization state machine, and the entire frontend (via Lustre, see below) are written in Gleam. The choice over Elixir is type safety: a CRDT engine that crashes a node because of a stray `nil` is much harder to debug than a compile error. The choice over pure Rust is the BEAM itself — see the next section.

### The BEAM (Erlang virtual machine)

The runtime that powers Erlang, Elixir, and Gleam. The BEAM gives you cheap green-thread processes (millions per node), preemptive scheduling, mailbox-based message passing, supervision trees that restart failed processes automatically, hot code reloading, and distribution primitives that let processes on different machines talk as if they were local. It is the runtime that powers WhatsApp, Discord's chat backend, RabbitMQ, and a large slice of the world's telecom infrastructure.

In Mycelium, the BEAM is what makes per-document concurrency cheap. Each open document is its own process. Each connected peer is its own process. Each long-running embedding job is its own process. Crashing one process never affects another. Restarting one process takes microseconds. The supervision tree means a corrupted document state does not corrupt the application — it just respawns.

### Lustre

A frontend framework written in Gleam, modeled directly after the Elm Architecture (model, view, update). Lustre supports three rendering modes: client-side single-page-app (compiled to JavaScript via Gleam's JS target), server-side rendering with hydration, and "server components" where the model lives on the server and the client receives DOM diffs over a websocket — the same architectural pattern as Phoenix LiveView, but in pure Gleam.

In Mycelium, Lustre runs in server-component mode. The document state lives on the BEAM, the websocket pushes diffs to the browser, and user interactions travel back as messages to the document process. This collapses the front/back distinction: the same Gleam codebase types the entire stack.

### Mist and Wisp

Mist is a low-level HTTP/1.1 and WebSocket server for Gleam. Wisp is a higher-level web framework built on top of Mist, providing routing, request parsing, and middleware. Together they provide what Plug + Cowboy provide for Elixir, but type-checked.

In Mycelium, Mist serves the local web UI on `127.0.0.1:<random port>`, and the embedded Tauri webview connects to it. Wisp handles the routing and middleware (authentication, CSRF, content negotiation).

### Loro

A Rust library implementing high-performance CRDTs (Conflict-free Replicated Data Types). Loro supports rich-text documents with split editing, lists, maps, trees, and counters, and it serializes operations into a compact binary log that is efficient to transmit and replay. Benchmarks published by the Loro team show order-of-magnitude advantages over Yjs and Automerge on large documents. Loro is also designed to be embeddable in non-Rust hosts.

In Mycelium, Loro is the canonical document representation. Every block, every line, every list item lives inside a Loro container. Edits become operations. Operations are content-addressed, ordered by Lamport timestamps, and merged deterministically regardless of arrival order. Loro is hosted in a separate Rust process per Mycelium node and communicated with through an Erlang port (see [Section 9](#9-the-crdt-layer) for why a port and not a NIF).

### Iroh

A peer-to-peer networking library written in Rust by the n0 team (former IPFS contributors). Iroh provides QUIC-based encrypted connections between peers, NAT traversal using hole-punching with optional STUN/relay assistance, content-addressed blob transfer using BLAKE3 hashes, and pluggable discovery (mDNS on the LAN, DNS-based discovery on the wider internet, or a small relay).

In Mycelium, Iroh is the entire wire. Devices in a ring know each other's public keys (Ed25519, used as Iroh `NodeId`s). When two devices want to talk, Iroh resolves their current addresses through discovery, performs hole-punching to open a direct UDP path, and falls back to a relay only if direct connectivity fails. All sync traffic, all attachment transfer, and all out-of-band signaling rides on Iroh QUIC streams.

### SurrealDB (embedded mode)

A multi-model database that supports document, graph, key-value, and full-text query patterns through a single query language, SurrealQL. It runs as a server but also as an embedded library, where the entire database lives in-process and writes to local files via RocksDB.

In Mycelium, SurrealDB runs embedded. The document graph (which note links to which, which task belongs to which project, which tag is applied to which block) is stored as graph relations. The block content is stored as documents. The vector index (embedding → block ID) is stored as vector-typed records, using SurrealDB's built-in vector search. One database, four query shapes, no ORM glue.

### Candle and fastembed-rs

Candle is a minimalist machine-learning framework in Rust by Hugging Face. It supports CPU and Metal/CUDA inference for transformer models without dragging in PyTorch. fastembed-rs is a thin wrapper over Candle (and ONNX Runtime, depending on the model) that exposes pre-quantized embedding models behind a simple API.

In Mycelium, fastembed-rs powers local semantic search. The model `all-MiniLM-L6-v2` (quantized INT8, ~22 MB) generates 384-dimensional embeddings for every block of text the user writes. Embeddings are stored in SurrealDB's vector index. A search query is itself embedded locally and matched by cosine similarity. The entire pipeline runs CPU-only, in roughly 5 ms per block on a modern laptop.

### WasmEdge

A WebAssembly runtime focused on cloud-native and edge use, with strong sandboxing and a small footprint. It supports the WASI standard interfaces and has bindings to Rust hosts.

In Mycelium, WasmEdge is the plugin sandbox. User-supplied plugins, written in any language that targets `wasm32-wasi` (Rust, Go, AssemblyScript, Zig, C, Swift), run in WasmEdge with a strict capability list (see [Section 14](#14-the-plugin-system)).

### age (encryption)

A modern file encryption format and tool by Filippo Valsorda. It uses X25519 for key agreement, ChaCha20-Poly1305 for symmetric encryption, and an elegant recipient model where a file can be encrypted to multiple public keys.

In Mycelium, age encrypts the local database file at rest, encrypts the per-document operation logs before they leave the device, and encrypts attachment blobs. The age recipient list for any given object is the set of devices in the user's ring.

### BLAKE3

A cryptographic hash function that is faster than SHA-256, parallelizable, and used as a content-addressable identifier across the system.

In Mycelium, BLAKE3 hashes identify documents, attachments, plugin binaries, and operation log chunks. Two devices that have computed the same BLAKE3 hash have the same content; sync becomes a hash-difference computation rather than a byte-by-byte diff.

### Tauri

A framework for building desktop applications using a system webview as the UI layer and Rust as the host process. Tauri produces small bundles (10–20 MB) compared to Electron (100+ MB) and gives the host process direct access to the OS.

In Mycelium, Tauri's Rust process is the supervisor of the BEAM release. On startup, Tauri launches the BEAM, waits for it to bind a localhost port, opens a webview pointing at that port, and forwards OS events (open with file, system notifications, deep links) to the BEAM via a small JSON protocol over a Unix socket or named pipe. When Tauri exits, it sends a graceful shutdown to the BEAM.

### Nix flakes

A reproducible package management and build system. A Nix flake pins every dependency — the compiler, the system libraries, the build tools — to specific cryptographic hashes, so that two machines with the same flake produce byte-identical outputs.

In Mycelium, the entire build is a Nix flake. `nix build` produces the release binary. `nix develop` drops you in a shell with the exact compiler and tool versions the project expects. CI uses the same flake. Reproducibility is not aspirational, it is enforced by the build system.

---

## 6. System architecture

### Where everything actually runs

Before going into the layers, a clarification that often confuses people coming from a server-side mental model. The BEAM is associated with backend servers because of its telecom and chat-backend lineage, but it is a runtime, not a deployment model — exactly like Node.js or the JVM. It runs wherever you put it.

In Mycelium, the BEAM runs **on each user device**. It is embedded inside the Tauri app, the same way Node.js is embedded inside an Electron app. Every device is a self-contained, full-stack node: it runs its own BEAM with its own supervision tree, its own embedded SurrealDB, its own Loro/Iroh/fastembed sidecars. Notes are written by the device's BEAM into the device's local SurrealDB file (`~/.local/share/mycelium/db` on Linux, equivalent paths on macOS and Windows), encrypted at rest with the device key.

There is no central machine that holds the canonical copy of your data. Each device has the complete copy. Sync is the act of two device-local BEAM instances exchanging encrypted CRDT operations directly over QUIC, peer to peer. Both ends of a sync connection are equal: each is a "server" and a "client" at the same time. The concept of "the server" simply does not exist in the solo topology.

The optional relay node described in [Section 16](#16-deployment-topologies) is yet another BEAM instance, identical to a desktop one but headless and running on a VPS the user controls. Even the relay is not a source of truth: it stores ciphertext only, cannot decrypt, and acts solely as a temporal store-and-forward buffer for moments when no two devices are simultaneously online. Removing the relay degrades convenience; it does not break correctness.

### The six layers

Mycelium runs as a single process tree. From the outside, the user sees an application icon and a window. From the inside, that window is a Tauri webview displaying a Lustre client connected over WebSocket to a Mist server running inside a BEAM release that supervises a tree of Gleam processes plus a sidecar Rust process running Loro plus a sidecar Rust process running fastembed plus an embedded SurrealDB.

Six layers stack vertically:

**Layer 1 — Operating system shell (Tauri).** Native window, native menus, native notifications, file-open intents, OS keychain access for storing the device key.

**Layer 2 — Frontend (Lustre + Gleam compiled to JS).** Renders the document editor, the sidebar, the search bar, the settings panel. Sends user actions over a websocket to Layer 3.

**Layer 3 — Application core (Gleam on the BEAM).** Hosts the supervision tree, the document processes, the peer processes, the search orchestrator, the plugin host, and the HTTP/WebSocket endpoints. This is where 80% of the project lives.

**Layer 4 — Native sidecars.** Loro (Rust) for CRDTs, fastembed (Rust) for embeddings, Iroh (Rust) for P2P. Each is a separate OS process spoken to over Erlang ports. Crashing a sidecar restarts the sidecar, not the application.

**Layer 5 — Storage (SurrealDB embedded).** The local database. Files on disk, encrypted at rest.

**Layer 6 — Plugin sandbox (WasmEdge).** User-supplied Wasm modules, isolated from everything except the explicit capability handles they were granted.

Two horizontal channels cross all layers: the **event bus** (a Gleam-native pub/sub used to broadcast model changes within the node), and the **wire protocol** (CBOR-encoded messages exchanged with peers over Iroh QUIC streams).

---

## 7. Process model on the BEAM

The BEAM allows hundreds of thousands of cheap processes per node. Mycelium leans on this hard. The supervision tree, simplified, looks like this:

```
mycelium_app
├── core_supervisor               (rest_for_one)
│   ├── config_server             (loads & watches config)
│   ├── identity_server           (manages device key, ring keys)
│   └── crypto_server             (age + BLAKE3 helpers)
│
├── storage_supervisor            (one_for_one)
│   ├── surreal_pool              (connection pool to embedded DB)
│   └── attachment_store          (BLOB I/O)
│
├── crdt_supervisor               (one_for_one)
│   ├── loro_port                 (Rust sidecar via Erlang port)
│   └── document_registry         (per-document dynamic supervisor)
│       ├── document_<id_1>       (one process per open document)
│       ├── document_<id_2>
│       └── ...
│
├── network_supervisor            (one_for_one)
│   ├── iroh_port                 (Rust sidecar)
│   ├── peer_registry             (dynamic supervisor)
│   │   ├── peer_<node_id_1>      (one process per known peer)
│   │   └── peer_<node_id_2>
│   └── sync_orchestrator         (decides what to send to whom)
│
├── search_supervisor             (one_for_one)
│   ├── fastembed_port            (Rust sidecar)
│   └── indexer                   (consumes change events, computes embeddings)
│
├── plugin_supervisor             (one_for_one)
│   ├── wasmedge_port             (Rust sidecar hosting WasmEdge)
│   └── plugin_registry           (dynamic supervisor of plugin instances)
│
└── http_supervisor               (one_for_one)
    ├── mist_listener             (HTTP/WebSocket on 127.0.0.1)
    └── lustre_session_registry   (one process per open browser tab)
```

Restart strategies are chosen carefully. `rest_for_one` for the core means that if `identity_server` dies, `crypto_server` restarts too (it depends on identity). `one_for_one` for documents means a corrupt document does not affect other documents.

A document process holds:
- The document's Loro container handle (a reference into the Loro sidecar).
- A list of subscribed Lustre session pids.
- A list of subscribed peer pids.
- A pending operation queue, in case the Loro sidecar is briefly unavailable.

When a user types a character, the keystroke flows: Lustre session → document process → Loro port (apply local op) → broadcast to subscribed sessions and peers in parallel. The document process is the single source of truth and the serialization point.

---

## 8. Data model

Mycelium's data model is a typed graph. Five primary entity types compose everything.

### Node

The atomic unit. A `Node` is anything that has a stable identity: a note, a task, a person, a tag, a project, a file. Every node has:

- A 128-bit ULID (lexicographically sortable, time-prefixed).
- A `kind` (one of `note`, `task`, `tag`, `project`, `person`, `file`, `link`, or a user-defined kind from a plugin).
- A `created_at` and `updated_at` (Lamport timestamps, not wall-clock — see CRDT section).
- A `body`: a Loro document containing rich-text blocks (paragraphs, headings, code, lists, tables, embeds).
- A `properties` map: typed key/value pairs. The keys are defined by the node's kind via a schema.
- A list of edges (relations to other nodes).

### Edge

A typed relation between two nodes. Edges have:

- A source node ID.
- A target node ID.
- A `relation` type (e.g., `parent`, `links_to`, `tagged`, `assigned_to`, `references`).
- A `properties` map (e.g., position in a list, weight, role).

Edges are themselves CRDT-managed: an edge is added when both endpoints causally agree, and edge removal uses tombstones with the same Lamport ordering as block deletion.

### Block

The unit of content inside a node's body. Blocks are nested CRDT structures: a paragraph block contains rich-text spans, a list block contains list items which are themselves blocks. The block tree is a Loro tree container, which means moves, splits, and merges all converge correctly under concurrent edits.

### View

A saved query over the graph. A view is `{ filter, group_by, sort, render_as }`. Filters use SurrealQL with vector-search predicates allowed. A view is itself a node, so views can be linked, tagged, and shared like any other content.

### Plugin invocation

When a plugin manipulates the graph, every operation it performs is recorded as a regular CRDT operation, attributed to the plugin's identity rather than a user. Undo/redo treats plugin operations as first-class.

---

## 9. The CRDT layer

The CRDT layer is the heart of the convergence story. Mycelium uses Loro for three reasons: rich-text support (split-and-merge of formatted text under concurrent edits is a hard problem and Loro solves it correctly), tree containers (moving a block while another peer is editing it converges), and binary log compactness (an operation is around 30 bytes on the wire after compression).

### Why a sidecar process and not a NIF

A Native Implemented Function in Erlang is a Rust function loaded into the BEAM's address space and called with zero serialization overhead. NIFs are fast but dangerous: a bug in a NIF can crash the entire BEAM, taking down every process. The BEAM's fault-tolerance guarantees do not extend across the FFI boundary.

Mycelium chooses safety over the last microsecond of latency. Loro runs as a Rust binary spawned by the BEAM as an Erlang **port**. Communication is line-framed CBOR over stdin/stdout. The port is owned by the `loro_port` GenServer. If the port crashes, the supervisor restarts it, and the document processes replay their pending operation queues against the fresh sidecar. Latency cost: roughly 50 microseconds per operation versus ~2 microseconds for a NIF. Imperceptible at human typing speed; correctness preserved.

### Operation flow

1. Lustre session receives a keystroke. Translates to a high-level intent (`insert_text`, `delete_block`, `move_block`).
2. Intent travels to the document process.
3. Document process forwards to `loro_port` with the document's container handle.
4. Loro applies the operation locally, returns the new operation log entry (the **op**).
5. Document process broadcasts the op to:
   - All subscribed Lustre sessions (so the UI updates instantly on every open tab),
   - All subscribed peer processes (which encrypt the op and send it over Iroh),
   - The `indexer` process (which schedules a re-embedding if the change affects searchable text).

### Convergence guarantees

Loro implements RGA-style sequence CRDTs and movable tree CRDTs. The convergence theorem is: given any two replicas that have observed the same set of operations, in any order, they end up in the same state. Mycelium does not weaken this guarantee anywhere — every state-changing user action is a Loro op, every plugin action is a Loro op.

### Garbage collection of operation logs

Operation logs grow without bound by default. Mycelium periodically computes a **stable version vector**: the version that every device in the ring has acknowledged. Operations older than the stable version vector are compacted into a snapshot and the prior log entries are discarded. The compaction is itself an operation, signed and acknowledged like any other, so a device that has been offline for months still resyncs correctly — it receives the snapshot first, then operations newer than the snapshot.

---

## 10. The peer-to-peer sync layer

Devices in a ring discover each other, establish encrypted QUIC connections, exchange operation logs, and keep their CRDT states converged. All of this runs through Iroh.

### Discovery

Three discovery mechanisms run in parallel:

1. **mDNS / DNS-SD on the LAN.** When two devices in the same ring are on the same Wi-Fi, they find each other in milliseconds via multicast.
2. **DNS-based discovery.** Each device publishes a TXT record under its `NodeId` to a configurable DNS zone. Mycelium ships with sensible defaults (n0's discovery service) but a user can run their own DNS server.
3. **Ring gossip.** A device that has connected to one peer learns about every other peer in the ring through gossiped peer lists, signed by the ring's signing key.

### NAT traversal

Iroh performs hole-punching between two nodes using a relay node as a coordinator. The relay is only used for the coordination handshake, not for data — once direct connectivity is established, traffic goes peer to peer. If hole-punching fails (symmetric NATs on both sides, restrictive corporate firewalls), traffic falls back to flowing through the relay, still encrypted end to end (the relay sees ciphertext only).

### Sync protocol

The protocol is a three-phase handshake on top of QUIC streams:

**Phase 1 — Authentication.** Both sides present a signature over a fresh nonce using their device key. Each side checks the signature against the ring membership list. Unknown public keys are rejected; revoked keys are rejected.

**Phase 2 — Version vector exchange.** Each side announces, per document, the version vector it has. The diff between two version vectors is a precise list of operations one side has and the other does not.

**Phase 3 — Operation transfer.** Operations are exchanged in both directions, batched, compressed (zstd), and applied to the receiver's Loro instance through the document process.

The sync protocol is incremental: a device that has been offline for a week does not redownload the entire workspace. It downloads the delta. If a snapshot has occurred since the device went offline, the device first receives the snapshot, then operations newer than the snapshot.

### Attachment transfer

Attachments (images, PDFs, arbitrary files) are not stored inside the CRDT — they are stored as content-addressed blobs (BLAKE3 hash → ciphertext). The CRDT contains only the hash. When a peer receives an op that references an unknown blob hash, it requests the blob from peers via Iroh's blob transfer protocol, which streams the content with progressive verification (every chunk's hash is checked against the BLAKE3 tree root).

### Backpressure

If a peer is slow or congested, the sender does not buffer unbounded operations. The sender's `peer_<node_id>` process applies a credit-based flow control: peers grant each other operation credits proportional to RTT and available bandwidth. When credits are exhausted, sending pauses until the peer acknowledges. This prevents a slow phone from causing a desktop to swap.

---

## 11. The cryptographic model

Cryptography in Mycelium has three concerns: identity, transport, and storage.

### Identity

Each device generates an Ed25519 key pair on first launch. The public key, encoded as the Iroh `NodeId`, is the device's permanent identity. The private key is stored in the OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service / libsecret).

A **ring** is a set of devices that share a workspace. The ring is identified by an Ed25519 ring key pair (the ring's own identity) and a list of authorized member device public keys. The ring private key is held by whichever device created the ring; new devices are authorized by signing their public key with the ring private key, producing a **member certificate**. Member certificates form a signed chain that any peer can verify offline.

### Adding a device

Adding a new device to a ring is a face-to-face operation by default. The existing device displays a QR code containing the ring private key, encrypted with a one-time PIN displayed alongside. The new device scans the QR, the user reads the PIN aloud, the new device decrypts the ring key, generates its own device key, signs a certificate, and announces itself to the ring. The ring private key never crosses an untrusted channel.

For remote enrollment, Mycelium implements a SPAKE2 password-authenticated key exchange where both devices type the same passphrase. The passphrase need not be high-entropy because SPAKE2 resists offline brute force.

### Revocation

Revoking a device adds a revocation entry to the ring's signed log. Every peer rejects connections from revoked NodeIds. Revocation is a CRDT operation like any other — a revocation observed by any device in the ring propagates to all of them. After revocation, a key rotation is triggered: a new ring data-encryption key is generated and used to re-encrypt future operations and snapshots. Past operations remain readable by anyone who already had them (perfect forward secrecy on the wire only, not on stored content — see threat model).

### Transport encryption

QUIC connections established by Iroh are encrypted with TLS 1.3 using the device key as the certificate. Peer authentication is mutual: each side verifies the other's certificate against the ring membership before exchanging any application data.

### At-rest encryption

The SurrealDB database file is encrypted using age, with the device key as the recipient. Attachments are encrypted with age, with the ring's data-encryption key as the recipient. Plugin code is stored as encrypted blobs. The decryption keys are loaded from the OS keychain at startup and held only in the BEAM's memory, never on disk in plaintext.

### Operation log encryption

Operations transmitted to peers are doubly protected: the QUIC stream encrypts the wire, and each operation payload is itself age-encrypted to the ring's data-encryption key before being sent. The relay (when used) sees only ciphertext.

---

## 12. The local semantic search engine

Mycelium's search is its most user-visible "wow" feature. Type a vague query, get the right note. The pipeline is:

### Indexing

When a node's body changes (the `indexer` process is notified by the document process via the event bus), the indexer:

1. Walks the block tree and extracts plain text per block, preserving block IDs.
2. Sends batches of (block_id, text) pairs to the `fastembed_port`.
3. The fastembed sidecar runs `all-MiniLM-L6-v2` quantized INT8 (or `bge-small-en` if the user prefers) and returns 384-dimensional vectors.
4. The indexer writes each (block_id, vector) into SurrealDB's vector index.
5. Indexing is idempotent and incremental — only changed blocks are re-embedded.

The model is downloaded from Hugging Face on first run, verified by its BLAKE3 hash against a pinned manifest shipped with the binary, and stored under the user data directory. The model never makes network requests after initial download.

### Query

A search query goes through the same model:

1. The query is embedded.
2. SurrealDB's `vector::similarity::cosine` operator returns the top-K block IDs with their similarity scores.
3. Block IDs are joined back to their parent nodes.
4. Results are ranked by a hybrid score: 70% semantic similarity, 20% recency, 10% backlink centrality. Weights are configurable.
5. Results are highlighted: the matching block is shown with surrounding context.

### Performance budget

On a M1 MacBook Air with 16 GB RAM and a corpus of 100,000 blocks:
- Indexing: ~5 ms per block, parallelized across CPU cores during bulk ingest.
- Query: ~30 ms for embedding + ~50 ms for vector search + ~20 ms for rendering = under 200 ms perceived latency.

The vector index uses HNSW (hierarchical navigable small worlds) inside SurrealDB. Memory usage scales linearly with corpus size: ~1.5 KB per indexed block, so 100k blocks ≈ 150 MB resident.

### Privacy guarantee

The model runs locally. The query never leaves the device. The indexed vectors live in the local encrypted database. The optional cloud relay never sees query text or vectors — it only relays opaque CRDT operations.

---

## 13. Storage layer

Storage in Mycelium is **strictly per-device**. Every device that participates in a ring has its own complete copy of the workspace on its local disk. There is no remote database that is the source of truth. Two devices that disagree about the state of a document do not consult an authority — they reconcile through the CRDT layer, peer to peer.

The optional relay node also has a local store, but its store contains only ciphertext operation logs, never decrypted state, never embeddings, never plaintext. The relay is not authoritative; it is a buffer.

SurrealDB embedded is the single store on each device. It manages four logical concerns inside one physical store:

**Document graph.** Nodes and edges as graph relations. Queries like "all tasks assigned to me, due this week, in projects tagged #work" are SurrealQL graph traversals.

**Block content.** Block records, indexed by block ID. The CRDT op log is stored separately (see below) and the materialized current state is mirrored into block records for fast read.

**Vector index.** Embeddings stored as `array<float, 384>` columns with HNSW indexing.

**Operation log.** A separate, append-only table per document, holding the encrypted Loro op log. Compaction periodically replaces a prefix of the log with a snapshot.

The physical storage format is RocksDB under the hood (SurrealDB's default backend). The RocksDB files live in the user data directory and are encrypted at rest at the file-system layer (each file age-encrypted to the device key, with a small kernel-level cache layer in memory for the working set).

Database migrations are versioned and applied by the `storage_supervisor` at startup, before any document processes start. Migrations are forward-only; rollback requires restoring from a snapshot.

---

## 14. The plugin system

Plugins extend Mycelium without modifying the core. A plugin is a Wasm module implementing a small interface contract. The contract is defined as a WIT (WebAssembly Interface Types) file shipped with the SDK.

### Capability model

Plugins are sandboxed by default. They have:

- No filesystem access.
- No network access.
- No access to the OS keychain.
- No access to other plugins' state.

They have, only when granted by the user:

- Access to a specific subgraph of nodes (e.g., "all nodes tagged #recipes").
- Access to the event bus (subscribe to node-changed events).
- Access to a per-plugin key-value store (isolated from the main database).
- Access to a metered HTTP egress proxy (only to user-allowlisted hostnames, with rate limits).

When a plugin is installed, the user reviews its requested capabilities, exactly like a mobile app permission prompt. The user can revoke any capability at any time.

### Plugin host

WasmEdge runs in a sidecar Rust process spawned and supervised by `plugin_supervisor`. Each plugin instance runs in a dedicated Wasm linear memory, with execution time and memory limits enforced. A plugin that exceeds its memory limit is killed and its work item is requeued (or fails, depending on the plugin's contract).

### Plugin invocation patterns

Three patterns are supported:

1. **Hooks.** A plugin can register for events (`on_node_created`, `on_node_changed`, `on_query_run`). The event handler is called with a snapshot of the relevant data.
2. **Commands.** A plugin can register a slash-command (`/summarize`, `/translate`). When the user invokes it, the plugin receives the current selection and may return a text replacement or a new node.
3. **Views.** A plugin can register a custom block renderer (e.g., a Mermaid diagram block). The plugin is given the block's text content and returns rendered HTML or SVG, sandboxed by the host before insertion.

### Distribution

Plugins are distributed as signed Wasm files. Mycelium maintains a community plugin index, but plugins can also be installed from a URL or local file. Every plugin is content-addressed by BLAKE3 and signed by its author's key. Updates are explicit — a plugin does not auto-update unless the user opts in per plugin.

---

## 15. Frontend architecture

The frontend is Lustre. The entire UI is a Gleam codebase that compiles to JavaScript and runs in the Tauri webview, with state management handled by Lustre's Elm-architecture model-update-view loop.

### Server-component mode

Mycelium uses Lustre's server-component pattern. The model lives on the BEAM, in a per-tab Gleam process (`lustre_session`). The browser holds a small runtime that:

1. Receives DOM diffs over a WebSocket.
2. Applies them to the live DOM.
3. Captures user events (clicks, keystrokes, drag-drops) and sends them as messages back to the server-side `lustre_session`.
4. Re-applies the next batch of diffs.

This keeps the JavaScript bundle tiny (~30 KB), keeps the source of truth on the BEAM (no client/server divergence bugs), and gives the entire frontend type safety end-to-end.

### Editor

The editor is a custom rich-text editor built on `contenteditable` with a strict mapping to Loro tree operations. Every keystroke is intercepted, translated to a CRDT operation, sent to the document process, and the resulting DOM diff is rendered. The editor supports:

- Block-level operations (paragraph, heading 1–4, bullet list, numbered list, todo, code block, quote, divider, callout, table).
- Inline marks (bold, italic, strikethrough, code, highlight, link).
- Slash commands (`/`).
- Keyboard shortcuts compatible with mainstream editors.
- Drag-and-drop block reordering.
- Multi-cursor display when multiple peers are editing the same document.

### Sidebar and navigation

The sidebar is a tree of nodes. Folders are nodes whose `kind` is `folder`. Backlinks, mentions, and tag pages are computed views over the graph. Navigation is keyboard-first.

### Search UI

A global command palette (Ctrl/Cmd+K) opens a unified bar. Typing performs semantic search incrementally with a 150 ms debounce. Results show the matching block, the parent node title, and a similarity score. Pressing Enter on a result navigates to the block.

---

## 16. Deployment topologies

Three topologies are supported.

### Solo

One user, one or more devices, no cloud. Devices sync directly P2P when they are simultaneously online. If a device has been offline, it catches up the next time it shares a network with another device in the ring.

This is the default and the simplest. It requires no servers and no infrastructure. The downside is that two devices that are never simultaneously online never sync — for a single user with a desktop and a phone that are usually both connected to the internet, this is essentially never a problem; for edge cases (a laptop kept in a drawer for months), the next topology helps.

### Solo with self-hosted relay

The user runs `mycelium serve` on a small VPS or home server. The relay is a Mycelium node configured to participate in the ring with sync-only privileges (no UI, no editor). Devices that come online sync through the relay if no other device is reachable. The relay sees only ciphertext; it cannot read content even if compromised.

The relay is a single binary, ~40 MB, with a ~50 MB resident memory footprint and negligible CPU usage. A cheap VPS or a Raspberry Pi is enough.

### Small team

A team of up to ~20 users, each with one or more devices, share a ring. Adding a member is the same flow as adding a device, except the new device is owned by a different user. The ring's signed membership log tracks which devices belong to which logical user, so audit and access control still work at the user level.

The team topology supports multiple optional relays, federated through gossip. Larger teams (50+ users) are not a current goal — the CRDT memory profile and the membership-list overhead start to become noticeable, and at that scale the local-first promise begins to compete with the team-coordination promise.

### Build artifacts per topology

- `mycelium-desktop-{macos,windows,linux}` — the full Tauri-wrapped app.
- `mycelium-server-{linux-x64,linux-arm64}` — the headless relay.
- `mycelium-cli` — a CLI for scripting, headless backups, and bulk import/export.

All artifacts are produced from the same Nix flake.

---

## 17. Build system and reproducibility

The project is one Nix flake, `flake.nix` at the repository root. The flake defines:

- A development shell (`nix develop`) with pinned Gleam, Erlang/OTP, Rust toolchain, Node.js (for one specific build helper), Tauri CLI, and CI tools.
- Per-target build outputs (`nix build .#desktop-linux`, `nix build .#server-linux-x64`, etc.).
- A formatter check (`nix fmt`) covering Gleam and Rust.
- A test runner (`nix flake check`) running unit, integration, and property tests.

Reproducibility goals:

- Two checkouts of the same commit, on the same architecture, produce byte-identical binaries.
- Cross-compilation: every target builds from any host (Linux x86_64 builds macOS arm64 binaries, etc.) using the Zig-based Rust cross-compilation toolchain pinned in the flake.
- Vendored dependencies: every Rust crate, every Gleam package, every system library is content-addressed.

CI runs `nix flake check` on every PR. A binary cache is published so contributors do not rebuild the whole world locally.

### 17.1 Auxiliary tooling

A small number of helper scripts live under `infra/ci/`. They are written in Python 3.12 and are invoked only by CI:

- `requirements_gate.py` — verifies the SPECIFICATION traceability matrix.
- `perf_gate.py` — parses `cargo bench` output and compares against `docs/compliance/perf_baseline.json`; fails on >10% regression per `SPEC §7.1`.

Python is intentionally not part of the runtime stack (`SPEC C-07` excludes C and C++ from first-party code; Python is permitted only in CI tooling because the alternative would be re-implementing trivial parsers in either Bash, which is platform-fragile, or a compiled language, which adds CI build time without benefit). Long-term the option to rewrite these scripts in Rust as `cargo xtask` recipes is open and tracked in [ADR-0013](docs/architecture/adr-0013-python-for-ci-helpers.md).

The CI workflows themselves are GitHub Actions YAML; they consume the Python helpers via `python3 infra/ci/<script>.py`.

---

## 18. Repository layout

```
mycelium/
├── flake.nix                     Reproducible build entry point
├── flake.lock
├── README.md
├── DOCUMENTATION.md
├── LICENSE                       AGPL-3.0
│
├── apps/
│   ├── core/                     Gleam — main BEAM application
│   ├── frontend/                 Gleam — Lustre UI compiled to JS
│   ├── cli/                      Gleam — scripting CLI
│   └── desktop/                  Rust — Tauri host
│
├── sidecars/
│   ├── loro_port/                Rust — CRDT sidecar over port protocol
│   ├── iroh_port/                Rust — P2P sidecar
│   ├── fastembed_port/           Rust — embedding sidecar
│   └── wasmedge_port/            Rust — plugin sandbox sidecar
│
├── proto/
│   ├── port.cddl                 CDDL schema for port-protocol messages
│   ├── wire.cddl                 CDDL schema for peer wire protocol
│   └── plugin.wit                WIT contract for plugins
│
├── plugins/
│   ├── sdk/                      Rust SDK for plugin authors
│   ├── examples/
│   │   ├── mermaid/              Renders Mermaid blocks
│   │   ├── translate/            Inline translation via local model
│   │   └── ical_import/          Imports calendar events as nodes
│   └── manifest_schema.json
│
├── infra/
│   ├── nix/                      Custom Nix builders
│   ├── ci/                       GitHub Actions workflows
│   └── relay_systemd.service     Sample systemd unit for the relay
│
├── docs/
│   ├── architecture/             Architecture decision records (ADRs)
│   ├── protocols/                Wire protocol spec, sync protocol spec
│   ├── threat_model.md
│   └── contributing.md
│
└── tests/
    ├── property/                 PropCheck-style stateful tests
    ├── integration/              Multi-node sync tests
    └── load/                     Soak tests
```

---

## 19. Development workflow

### First-time setup

```
git clone https://github.com/<org>/mycelium
cd mycelium
nix develop
```

The shell drops you in an environment with every tool pinned to its expected version. No system installs, no version skew.

### Running locally

```
just dev
```

A `justfile` orchestrates the local dev loop: it starts the BEAM application in `--observer` mode, the Tauri shell in development mode, the sidecars with auto-restart on rebuild, and the Lustre frontend with hot reload.

Two parallel local instances can be run with `just dev-pair` to exercise sync logic on a single machine.

### Configuration

Configuration lives in `~/.config/mycelium/config.toml` (Linux), `~/Library/Application Support/Mycelium/config.toml` (macOS), or `%APPDATA%\Mycelium\config.toml` (Windows). A minimal example:

```toml
[node]
ring = "default"
device_name = "alice-laptop"

[network]
discovery = ["mdns", "dns"]
relay_url = ""                   # empty means no relay
listen_port = 0                  # 0 means OS-assigned

[search]
model = "all-MiniLM-L6-v2"
quantization = "int8"

[storage]
db_path = "~/.local/share/mycelium/db"
attachments_path = "~/.local/share/mycelium/attachments"
encrypt_at_rest = true

[ui]
theme = "auto"
language = "en"
```

### Logging

Structured logs in JSON format, routed to platform-appropriate log directories. A `mycelium-cli logs tail` command streams them with structured filtering. Log levels are configurable per supervision subtree.

---

## 20. Testing strategy

Five layers of tests, each targeting a different invariant.

**Unit tests in Gleam** for pure functions and small modules. Run with `gleam test` against the per-module test suites.

**Property tests** for CRDT invariants. PropCheck-style stateful tests generate random sequences of operations across simulated peers, apply them in random orders, and assert that all replicas converge. Critical for catching CRDT bugs that only manifest under specific concurrent edit patterns.

**Integration tests** that spin up two to five Mycelium nodes in-process, connected via a stub network, and exercise full user scenarios: edit, sync, go offline, edit offline, come back, verify convergence. Network conditions (latency, drops, partitions) are simulated.

**End-to-end tests** that drive the actual Tauri app via WebDriver, on real OSes, through GitHub Actions matrix builds.

**Soak tests** that run a 24-hour multi-node sync loop with random churn, used to catch slow leaks and drift. Run weekly in CI.

Coverage target: ≥ 85% line coverage on Gleam code, ≥ 75% on Rust sidecars (the sidecars are thinner).

---

## 21. Performance and resource budget

Targets, validated on a baseline machine (M1 MacBook Air, 8-core, 16 GB RAM):

| Concern | Target |
|---|---|
| Cold start (Tauri launch → first paint) | ≤ 1.2 s |
| Warm typing latency (keystroke → DOM update) | ≤ 16 ms (one frame at 60 Hz) |
| Local search query latency (100k blocks) | ≤ 200 ms p95 |
| Sync latency (LAN, two devices) | ≤ 80 ms per op end-to-end |
| Sync latency (internet, hole-punched) | ≤ 250 ms per op p95 |
| Memory at idle (10k blocks loaded) | ≤ 250 MB resident |
| Memory under load (100k blocks, search active) | ≤ 800 MB resident |
| Disk usage (100k blocks, encrypted) | ~400 MB |
| Cold sync of 100k-block ring (LAN) | ≤ 90 s |

Performance regressions are gated in CI: a benchmark suite runs on every PR, and a regression of more than 10% on any tracked metric blocks merge.

---

## 22. Threat model

Explicit assumptions about who Mycelium defends against and who it does not.

### In scope

- **Passive network observers.** Cannot read content (TLS + age). Cannot identify rings (NodeIds are random Ed25519 public keys). Can observe metadata (which IPs talk to which IPs, when, how much).
- **Compromised relay.** Sees ciphertext only. Cannot decrypt. Can drop or reorder messages, but the CRDT layer is robust to reordering, and dropped messages are eventually retransmitted.
- **Stolen device, encrypted disk.** OS keychain protects the device key; without the OS unlock, the keychain is sealed. The local database is age-encrypted with the device key. The attacker without the OS password sees ciphertext.
- **Lost device.** User revokes the device's key in the ring. Future sync rejects the lost device. Past data already on the device remains accessible to whoever holds the device — Mycelium does not provide remote wipe (the device may be offline when revocation is issued).

### Out of scope

- **Stolen device, unlocked.** If the OS is unlocked and the user is logged in, an attacker with physical access can read everything. Mycelium relies on OS-level protection.
- **Compromised endpoint with root.** A keylogger on the user's machine sees every keystroke before it is encrypted. Mycelium cannot defend against this.
- **Forward secrecy of stored content.** The QUIC wire protocol provides forward secrecy. Stored content does not: a key compromise lets an attacker decrypt all past stored ciphertext on that device. Forward-secret storage is a design tradeoff (it would require continuous re-encryption of everything, which is infeasible at storage scale).
- **Traffic analysis at scale.** A global passive adversary watching all internet traffic could correlate Mycelium nodes' encrypted flows. Mycelium does not implement traffic shaping or onion routing.
- **Plugin-level attacks.** A malicious plugin granted access to a node subgraph can exfiltrate that subgraph through whatever capabilities the user granted. The capability model limits damage but does not prevent it. Users should treat plugin installation with the same care they treat installing native software.

### Audit

The cryptography is intended for an external audit before the 1.0 release. The protocol specs in `docs/protocols/` are written explicitly to be audit-readable.

---

## 23. Roadmap

### Milestone 0 — Walking skeleton

- Single-node app: open, write, save notes locally.
- SurrealDB embedded.
- Lustre UI with a basic block editor.
- Tauri wrapper.
- Nix flake for Linux x86_64 only.

### Milestone 1 — Local-first MVP

- Loro CRDT integration.
- Two-node sync over Iroh, LAN-only.
- Device key generation and OS keychain integration.
- Ring creation and device pairing via QR.

### Milestone 2 — Search and plugins

- fastembed integration.
- Vector index in SurrealDB.
- Plugin sandbox with WasmEdge.
- Two reference plugins: Mermaid renderer, slash-command translator.

### Milestone 3 — Production polish

- macOS and Windows builds.
- Self-hosted relay binary.
- DNS-based discovery.
- Operation log compaction.
- 24-hour soak test green.

### Milestone 4 — 1.0

- External cryptography audit.
- Documentation site.
- Plugin community index.
- Auto-update system (signed deltas).

### Beyond 1.0

- Mobile clients (Tauri Mobile when stable, or a native Lustre-server-component browser app).
- Conflict-free schema evolution for plugin-defined node kinds.
- Differential dataflow integration for live materialized views.
- Multi-ring devices (one device participating in multiple rings, with isolated keys).

---

## 24. Glossary

**BEAM.** The Erlang virtual machine. Runs Erlang, Elixir, Gleam.

**Block.** A unit of content inside a node's body — a paragraph, a list item, a code fence.

**CRDT.** Conflict-free replicated data type. A data structure that allows independent replicas to merge without conflict, given a defined operation set and merge function.

**Device key.** Per-device Ed25519 key pair identifying a device on the network.

**Edge.** A typed relation between two nodes in the document graph.

**Iroh.** The QUIC-based P2P library Mycelium uses for peer connectivity and content-addressed blob transfer.

**Lamport timestamp.** A logical clock providing a partial ordering of events in a distributed system.

**Lustre.** The Gleam frontend framework, modeled on the Elm Architecture.

**Loro.** The Rust CRDT library Mycelium uses as its document representation.

**mDNS.** Multicast DNS, the LAN service-discovery protocol Mycelium uses to find peers on a local network.

**NIF.** Native Implemented Function — a Rust (or C) function loaded into the BEAM's address space. Mycelium avoids NIFs in favor of ports for safety.

**Node.** The atomic identity in Mycelium's data model. A note, task, person, project, or any other identifiable entity is a node.

**Port.** An Erlang abstraction for an external program connected via stdin/stdout, communicating with the BEAM. Mycelium uses ports to host its Rust sidecars.

**Ring.** A set of devices sharing a workspace, identified by a ring key pair, governed by a signed membership log.

**Snapshot.** A compacted representation of an operation log up to a specific Lamport timestamp.

**Stable version vector.** A version vector below which every device in the ring has acknowledged receipt; operations below this vector can be safely compacted.

**SurrealDB.** The embedded multi-model database used as Mycelium's local store.

**Tauri.** The Rust desktop-app framework hosting Mycelium's webview.

**Version vector.** A map from node IDs to their current Lamport timestamps, used to compute sync diffs.

**WasmEdge.** The WebAssembly runtime hosting Mycelium plugins.

**WIT.** WebAssembly Interface Types, the IDL used to define Mycelium's plugin contract.

---

*Mycelium is licensed under AGPL-3.0. Cryptographic specifications, wire protocol, and plugin contract are released under CC-BY-4.0 to encourage independent implementations.*
