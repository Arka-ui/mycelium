# ADR-0001 — Record architecture decisions

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team

## Context

Mycelium is built by a small distributed team using a niche stack (BEAM + Gleam + Loro + Iroh + SurrealDB + Tauri + WasmEdge + Nix). Many of the choices feel arbitrary unless the rationale is explicit. New contributors will repeatedly ask "why X and not Y" — for the language, the database, the CRDT engine, the no-NIF policy, the desktop shell, the build system, the encryption format. Without a written record, those answers exist only in the heads of whoever was present at the time, and they erode.

`../SPECIFICATION.md` constraint **C-01** binds the v1.0 stack and requires an ADR for any substitution. **NFR-MAINT-03** requires an ADR for every significant architectural choice.

## Decision

Adopt **Architecture Decision Records** in the [Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) (Status / Context / Decision / Consequences). Records live in `docs/architecture/adr-NNNN-short-title.md`, numbered sequentially, never deleted, only superseded.

The template is `docs/architecture/adr-template.md`.

The ADR process:

1. The proposer copies the template to a new file with the next sequential number.
2. The PR contains *only* the ADR (and any updates to other ADRs marking them Superseded).
3. Discussion happens in the PR. The Status starts as `Proposed`.
4. On acceptance the Status changes to `Accepted` and the PR merges.
5. Implementation begins in a follow-up PR that references the ADR.

ADRs are append-only. To reverse a decision, write a new ADR that supersedes the old one and update the old one's Status.

## Consequences

- Every substantive choice has a written rationale that survives contributor turnover.
- New contributors can read the ADR sequence and reconstruct the project's reasoning.
- Security auditors have a directly-citable trail for cryptographic and protocol choices.
- Decision-making is slowed slightly: every non-trivial change requires an ADR before code. We accept this trade in exchange for institutional memory.
- Numbering is a soft commitment: gaps are allowed if a draft is abandoned, and the maintainer who merges renumbers if there's a collision.

## References

- Michael Nygard, "Documenting Architecture Decisions" (2011).
- `../SPECIFICATION.md` §13.3 (Review quality), C-01, NFR-MAINT-03.
