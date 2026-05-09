# Maintainers

This document lists the people responsible for reviewing pull requests, accepting RFCs, cutting releases, and enforcing the Code of Conduct.

## Current maintainers

| Handle | Role | Areas of focus |
|---|---|---|
| *(unfilled)* | Project lead | Architecture, roadmap, release management |
| *(unfilled)* | Core | Gleam BEAM core, supervision tree, document model |
| *(unfilled)* | Sidecars | Rust sidecars (surreal_port, loro_port, iroh_port, fastembed_port, wasmedge_port) |
| *(unfilled)* | Frontend | Lustre UI, server-component runtime, editor |
| *(unfilled)* | Cryptography | Identity, ring management, wire protocol, threat model |
| *(unfilled)* | Build & release | Nix flake, CI, packaging, reproducibility |

The roster is to be filled in by the project lead during M3 (production polish) when external contributors are onboarded.

## Contact

- General project questions: open a GitHub issue or post on the project's discussion channel.
- Code of Conduct reports: **conduct@mycelium.invalid** *(placeholder — to be replaced before 1.0)*
- Security disclosures: see [`../.github/SECURITY.md`](../.github/SECURITY.md).

## Becoming a maintainer

A contributor is eligible for maintainer status after:

1. **Sustained contribution** — at least three months of substantive contributions across multiple areas of the codebase.
2. **Demonstrated judgement** — has authored or reviewed at least one accepted ADR.
3. **Endorsement** — proposed by an existing maintainer; ratified by majority vote of the current maintainer team (simple majority, with the project lead holding a tie-breaking vote).

The new maintainer chooses one or two areas of focus and is added to this file in the same PR that grants commit rights.

## Stepping down

Maintainers may step down at any time by opening a PR removing themselves from this list. They retain the option to return as a contributor at any point. The project lead may also remove an inactive maintainer (no review or RFC activity for six months) after a notification period of 30 days.

## Project lead transition

The project lead role rotates by majority vote of the maintainer team. Transition is documented in an RFC. The outgoing lead remains a maintainer unless they choose otherwise.

## Decision-making

- Trivial changes: standard PR review (one maintainer approval).
- Substantive changes: RFC required (`docs/rfc/`), discussed in the open, accepted by maintainer consensus.
- Security-sensitive changes: two maintainer approvals required (per [`../.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md)).

See [`../.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md) and [`docs/contributing.md`](docs/contributing.md) for the long-form process.
