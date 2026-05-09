# Mycelium Documentation

> A local-first, end-to-end encrypted, peer-to-peer collaborative knowledge workspace with on-device semantic search.

This site is built from the `docs/` tree using [mdBook](https://rust-lang.github.io/mdBook/). Render locally:

```bash
cargo install mdbook mdbook-linkcheck --locked
cd docs
mdbook serve
```

The generated site lives at `book/` (one level up).

## Layout

- **Architecture** — high-level technical overview, formal SRS, data model, roadmap.
- **ADRs** — Architecture Decision Records (Michael Nygard format) for every significant choice.
- **Protocols** — port protocol (BEAM ↔ Rust sidecar) and wire protocol (peer ↔ peer over QUIC).
- **Plugins** — capability-based plugin contract and SDK.
- **Security** — threat model + external audit dossier + cryptographic-file inventory.
- **Contributing** — long-form contributor guide.

## Quick links

- **For end users**: read the project [README](https://github.com/mycelium-app/mycelium#readme) and [SETUP](https://github.com/mycelium-app/mycelium/blob/main/SETUP.md).
- **For plugin authors**: [Plugin SDK](plugins/sdk.md) and [Plugin contract](plugins/contract.md).
- **For security auditors**: [Threat model](threat_model.md) and [Audit dossier](audit/AUDIT_DOSSIER.md).
- **For contributors**: [Contributor guide](contributing.md) and the [ADR sequence](architecture/adr-0001-record-architecture-decisions.md).
