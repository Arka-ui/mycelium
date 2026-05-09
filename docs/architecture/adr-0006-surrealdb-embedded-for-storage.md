# ADR-0006 — SurrealDB embedded for the local store

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team

## Context

Mycelium's local store has four shapes of query against the same data:

1. **Document content** — fetch a node by ID, list nodes by recency.
2. **Graph traversal** — "all tasks assigned to me, in projects tagged #work, due this week."
3. **Vector search** — semantic search over block embeddings.
4. **Append-only log** — the per-document CRDT operation log.

Three options were considered:

- **SQLite + custom indexes** — universally available, mature. We'd write graph traversal as recursive CTEs and vector search as a custom extension or a sidecar. Workable but four query shapes against one model becomes tangled.
- **Several specialized stores** (LMDB for KV, sled for log, RocksDB for blobs, sqlite-vec for vectors). Reduces coupling but explodes the operational surface and the migration story.
- **SurrealDB embedded** — multi-model database (document + graph + KV + vector) with one query language (SurrealQL). Embedded mode is a Rust library; it stores files via RocksDB.

## Decision

Use **SurrealDB embedded** as the single local store. It is hosted in `sidecars/surreal_port/` (per ADR-0003 — the Rust crate is library-only and we need it in a sidecar to honour the no-NIF policy). All four query shapes go through the same database file.

The CRDT operation log is a separate table per document; the materialized current state of a node is mirrored into a regular row for fast read; the vector index lives on a vector-typed column with HNSW indexing (M2).

## Consequences

- One file format on disk. One backup, one restore, one migration path.
- One query language to learn (SurrealQL).
- Risk: SurrealDB is younger and smaller than SQLite. Mitigation: pin a specific version in `Cargo.toml`, document the schema migration path, treat the embedded engine as the abstraction (the wire format is private; the table shapes are documented in `docs/architecture/data_model.md`).
- The sidecar boundary has perfectly fine throughput for the working set (single-digit-µs per call to the BEAM, milliseconds to disk; the BEAM↔sidecar overhead is dominated by I/O).
- At-rest encryption (FR-CRYPTO-07) is layered above the file system: in M2 the sidecar will integrate `age` to wrap RocksDB SST files at write time. SurrealDB itself doesn't need to be aware.

## References

- `../MYCELIUM.md` §5 (Stack), §13 (Storage layer).
- `../SPECIFICATION.md` FR-SEARCH-01 (semantic search), FR-NOTES-04/05 (typed properties + edges).
- SurrealDB: https://surrealdb.com
