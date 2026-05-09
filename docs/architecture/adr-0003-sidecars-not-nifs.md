# ADR-0003 — Sidecar processes, not NIFs, for native code

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team, security reviewers

## Context

Several of Mycelium's components are Rust libraries: Loro (CRDTs), Iroh (P2P), SurrealDB (storage), fastembed-rs (embeddings), WasmEdge (plugin sandbox). The BEAM gives us two ways to call into Rust:

1. **NIF (Native Implemented Function)** — Rust function loaded into the BEAM's address space, called with near-zero serialization overhead. Roughly 1–2 µs per call.
2. **Port** — Rust binary spawned as a child process by the BEAM, communicating over stdin/stdout with framed messages. Roughly 50 µs per call.

NIFs are dramatically faster. They are also dramatically more dangerous: any memory-safety bug, any panic that escapes a `catch_unwind`, any FFI mistake takes down the **entire BEAM**, not just the calling process. The BEAM's vaunted fault tolerance does not extend across the FFI boundary inside its own address space. For a single-binary distribution where an unrecoverable crash means the user loses their open editing session, this is unacceptable.

`../MYCELIUM.md` §9 explicitly weighs this trade and chooses safety.

## Decision

**No first-party NIFs.** Every Rust component runs as a separate OS process spawned by the BEAM as an Erlang **port**. The on-the-wire protocol is line-framed JSON in M0/M1 (line-framed CBOR in M2+), defined by `proto/port.cddl` and documented in `docs/protocols/port.md`.

A sidecar crash is contained: the supervisor restarts only the sidecar; document and session processes replay their pending operation queues against the fresh sidecar. The BEAM keeps running.

## Consequences

- Latency cost: ~50 µs vs. ~2 µs per call. Imperceptible at human typing speed (16 ms frame budget). Cumulative cost is negligible compared to network or disk I/O.
- Each sidecar is a separately compiled, separately versioned Rust crate. Independent CI builds.
- Sidecar crashes are *recoverable*. Property tests must verify document processes correctly replay queued ops after a sidecar restart.
- Cross-platform binary distribution is slightly more complex: we ship multiple `.exe`/binaries inside the bundle and the BEAM must locate them. Tauri handles this via the `bin/` resource directory.
- The architecture coheres: the same pattern (BEAM ↔ port) applies to every native component, so contributors learn one mental model.
- Plugins (WasmEdge) are isolated *twice*: once by the sidecar boundary, once by the Wasm sandbox. Defense in depth.

## Alternatives considered

- **Selectively use NIFs for the hot paths** (e.g. Loro op application). Rejected because the boundary becomes a per-component judgement call and the safety property is binary. Either every native call is supervised, or none are.
- **Rustler with `dirty_cpu` schedulers** to mitigate NIF blocking. Doesn't address the safety-isolation problem; only the scheduling-fairness problem.

## References

- `../MYCELIUM.md` §6 (six-layer architecture), §9 (CRDT layer / "Why a sidecar process and not a NIF").
- `../SPECIFICATION.md` NFR-AVAIL-03 (sidecar crash isolation), NFR-SEC-07 (memory-safe languages only).
- `docs/protocols/port.md` (port protocol spec).
