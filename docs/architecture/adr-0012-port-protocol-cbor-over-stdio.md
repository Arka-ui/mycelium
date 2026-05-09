# ADR-0012 — Port protocol: line-framed JSON in M0/M1, CBOR in M2+

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team

## Context

Per ADR-0003, the BEAM communicates with Rust sidecars over Erlang ports (stdin/stdout). The on-the-wire framing must be:

- **Self-delimiting** — sender writes a discrete message; receiver reads exactly that message.
- **Schema-able** — the envelopes have a CDDL definition (`proto/port.cddl`) so divergence between the BEAM side and the Rust side is detectable.
- **Debuggable** — when something goes wrong, dumping a raw stdin/stdout pipe should yield human-readable diagnostics.
- **Forward-compatible** — adding new request methods or response fields should not break older sidecars.

Two encodings were candidates:

- **CBOR** (Concise Binary Object Representation, RFC 8949) — binary, compact, with a CDDL schema language. Production-grade. Less debuggable.
- **Line-framed JSON** — text, larger on the wire, trivially debuggable. Slower to parse on the hot path.

The hot path for a port call is on the order of 50 µs end-to-end (per ADR-0003). A CBOR vs. JSON parse difference is on the order of microseconds for our envelope sizes — negligible compared to the port-spawn cost itself.

## Decision

Use **line-framed JSON** for M0 and M1. Each message is a single JSON object on its own line, terminated by `\n`. The schema (`proto/port.cddl`) is reusable across encodings; we generate it now so M2 can switch to CBOR without redesign.

In **M2** we revisit. By then the volume of port traffic is dominated by sync (Iroh, M1) and embeddings (fastembed, M2), both of which carry larger payloads where CBOR's compactness pays off. The JSON-RPC error-code table and method registry stay identical.

## Consequences

- Port traffic is debuggable with `cat`. A misbehaving sidecar's stdin/stdout can be teed to a file and inspected.
- The sidecar codecs are tiny: `serde_json` on the Rust side, `gleam_json` on the BEAM side.
- Method registry and error-code table (`docs/protocols/port.md`) are encoding-independent.
- Migration cost in M2 is bounded: the `gleam_json` and `serde_json` calls become `gleam_cbor` and `ciborium` calls. Each affected module changes in one place (the codec wrapper).
- M0 latency cost is acceptable: CRUD round-trips against `surreal_port` are well under 5 ms even with JSON parsing dominating.

## References

- `../MYCELIUM.md` §6 (Layer 4 sidecars), §9 (CRDT layer).
- `../SPECIFICATION.md` NFR-MAINT-04 (versioned public APIs).
- `docs/protocols/port.md` (authoritative spec).
- `proto/port.cddl` (encoding-independent schema).
