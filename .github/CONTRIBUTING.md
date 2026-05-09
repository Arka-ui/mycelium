# Contributing

Thank you for considering contributing to Mycelium. This document is the short index. The long-form contributor guide lives at [`docs/contributing.md`](docs/contributing.md).

---

## TL;DR

1. Read [`../docs/MYCELIUM.md`](../docs/MYCELIUM.md) and [`../docs/SPECIFICATION.md`](../docs/SPECIFICATION.md) once.
2. Install the toolchain: [`../docs/SETUP.md`](../docs/SETUP.md).
3. Pick an issue labeled `good first issue` or `help wanted`.
4. Fork, branch (`feat/<short-name>` or `fix/<short-name>`), write code + tests, run `just fmt && just check && just test`.
5. Open a PR against `main`. CI runs the same checks; merge requires green CI + one maintainer review (two for security-sensitive modules).

---

## Workflow

- **Branch naming**: `feat/short-name`, `fix/short-name`, `docs/short-name`, `refactor/short-name`, `chore/short-name`.
- **Commit style**: imperative mood, present tense ("add port heartbeat", not "added"). One concern per commit. Reference issues with `#123` in the body, never in the subject.
- **PR size**: prefer ≤ 400 lines changed. Larger PRs need an ADR or pre-discussion.
- **Tests**: every Must requirement (per `../docs/SPECIFICATION.md` §6) needs an automated test. Bug fixes need a regression test.
- **Formatting**: enforced by `gleam format` and `rustfmt`. CI rejects unformatted code.
- **Lints**: `cargo clippy --deny warnings` must pass on the project lint profile.

---

## Architecture changes

Substantive changes (new features, protocol changes, dependency additions, supervision-tree edits) require an **Architecture Decision Record**. The process:

1. Copy `docs/architecture/adr-template.md` to a new file `docs/architecture/adr-NNNN-short-title.md` (next sequential number).
2. Fill out: Status, Context, Decision, Consequences (Michael Nygard format).
3. Open a PR containing only the ADR. Discuss in PR review.
4. Once accepted (Status: Accepted), implement in a follow-up PR.

See `docs/architecture/adr-0001-record-architecture-decisions.md` for the rationale.

---

## Security-sensitive modules

Changes to the following modules require **two** maintainer reviews and a security-focused code review:

- `apps/core/src/mycelium/identity_server.gleam`
- `apps/core/src/mycelium/crypto_server.gleam`
- `apps/core/src/mycelium/network/` (anything in this subtree)
- `sidecars/iroh_port/`
- `sidecars/wasmedge_port/`
- The wire protocol spec (`docs/protocols/wire.md`)
- The plugin contract (`proto/plugin.wit`, `docs/plugins/contract.md`)

Vulnerability disclosure is documented in [`SECURITY.md`](SECURITY.md). Please do not open public issues for suspected vulnerabilities.

---

## Code of Conduct

This project adopts the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md). Harassment is not tolerated. Maintainers will enforce.

---

## License

By contributing, you agree your contributions are licensed under the same license as the project component you modify:

- Application code: AGPL-3.0-or-later.
- Plugin SDK: MIT.
- Documentation: CC-BY-4.0.

See [`LICENSE`](LICENSE), [`plugins/sdk/LICENSE`](plugins/sdk/) (created at M0 alongside the SDK), and [`../docs/LICENSES.md`](../docs/LICENSES.md).
