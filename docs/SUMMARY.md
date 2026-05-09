# Summary

[Introduction](README.md)

# Architecture

- [Overview (MYCELIUM.md)](MYCELIUM.md)
- [Specification (SRS)](SPECIFICATION.md)
- [Data model](architecture/data_model.md)
- [Roadmap](architecture/roadmap.md)

# Architecture Decision Records

- [ADR-0001 — Record architecture decisions](architecture/adr-0001-record-architecture-decisions.md)
- [ADR-0002 — Gleam on the BEAM](architecture/adr-0002-language-choice-gleam-on-beam.md)
- [ADR-0003 — Sidecars not NIFs](architecture/adr-0003-sidecars-not-nifs.md)
- [ADR-0004 — Loro CRDTs](architecture/adr-0004-loro-as-crdt-engine.md)
- [ADR-0005 — Iroh P2P](architecture/adr-0005-iroh-for-p2p-transport.md)
- [ADR-0006 — SurrealDB embedded](architecture/adr-0006-surrealdb-embedded-for-storage.md)
- [ADR-0007 — Lustre server-components](architecture/adr-0007-lustre-server-components-for-ui.md)
- [ADR-0008 — Tauri shell](architecture/adr-0008-tauri-for-desktop-shell.md)
- [ADR-0009 — age + BLAKE3](architecture/adr-0009-age-and-blake3-for-cryptography.md)
- [ADR-0010 — WasmEdge plugin sandbox](architecture/adr-0010-wasmedge-for-plugin-sandbox.md)
- [ADR-0011 — Nix flakes for reproducibility](architecture/adr-0011-nix-flakes-for-reproducibility.md)
- [ADR-0012 — Port-protocol codec](architecture/adr-0012-port-protocol-cbor-over-stdio.md)

# Protocols

- [Port protocol (BEAM ↔ sidecars)](protocols/port.md)
- [Wire protocol (peer ↔ peer)](protocols/wire.md)

# Plugins

- [Plugin contract](plugins/contract.md)
- [Plugin SDK](plugins/sdk.md)

# Security

- [Threat model](threat_model.md)
- [Audit dossier](audit/AUDIT_DOSSIER.md)
- [Audit inventory](audit/inventory.md)

# Contributing

- [Contributor guide](contributing.md)
