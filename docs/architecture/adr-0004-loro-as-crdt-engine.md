# ADR-0004 — Loro as the CRDT engine

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team

## Context

Mycelium's collaborative-editing story rests on a CRDT (conflict-free replicated data type) engine. The engine must:

- Support **rich text** with split editing (paragraphs split mid-sentence under concurrent edits converge to the same shape).
- Support **tree containers** (a block moved by one peer while another is editing it converges).
- Produce **compact binary operation logs** (sync efficiency).
- Be **embeddable in non-Rust hosts** (we host it from Gleam via a port).

Three engines were candidates:

- **Yjs** — JavaScript-first, mature, broad ecosystem. Rust port (`y-crdt`) is solid. Rich-text via `Y.XmlFragment`. Tree moves are awkward.
- **Automerge** — Rust-native, JSON-CRDT model. Strong on schema-less documents. Rich-text support exists but operation logs are larger; tree-move converging is recent and less battle-tested.
- **Loro** — Rust-native, designed for rich text and trees from day one. Published benchmarks show order-of-magnitude advantages over Yjs/Automerge on large documents. Compact binary log. Embeddable.

## Decision

Use **Loro** as the CRDT engine. It's hosted in `sidecars/loro_port/` (per ADR-0003) and accessed by `apps/core/src/mycelium/crdt/loro_port.gleam`.

## Consequences

- Operation log on the wire is small (~30 bytes/op after compression), which keeps sync cheap.
- Tree-move convergence is correct out of the box; we don't reimplement it.
- The port boundary serializes ops as opaque byte blobs, so a Loro version bump only requires the sidecar to be rebuilt — the BEAM side and the protocol envelope stay stable.
- Risk: Loro is younger than Yjs/Automerge. Mitigation: pin version in `Cargo.toml`, keep the operation-log format documented in `docs/protocols/wire.md` independently of the upstream library, fall back to a fork if the project stalls.
- The sidecar process owns the CRDT state. Document processes on the BEAM hold opaque container handles only; this prevents accidental copy semantics in Gleam from corrupting CRDT internals.

## References

- `../MYCELIUM.md` §5 (Stack), §9 (CRDT layer), §10 (sync protocol).
- `../SPECIFICATION.md` FR-SYNC-03 (strong eventual consistency), R-04 (CRDT convergence bug mitigation), NFR-MAINT-02 (property tests for convergence).
- Loro: https://loro.dev
