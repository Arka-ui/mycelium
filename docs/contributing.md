# Contributor Guide (long form)

The short version is at [`../.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md). This is the deep version.

---

## Mental model

Before writing code, read three documents:

1. [`MYCELIUM.md`](MYCELIUM.md) — architecture and rationale (1 hour read).
2. [`SPECIFICATION.md`](SPECIFICATION.md) — what's required and what's not (30 minutes).
3. [`docs/architecture/`](architecture/) — the ADR sequence in order (45 minutes).

If any decision in the codebase surprises you, the answer is almost certainly in an ADR. If it isn't, that's a documentation gap; please open an issue.

The high-level mental model:

- The BEAM is the orchestrator. Every long-lived concern is a Gleam process.
- Native code (CRDTs, P2P, storage, embeddings, plugins) is in **Rust sidecars**, never in the BEAM's address space (per ADR-0003).
- The frontend is **Lustre server-components** (per ADR-0007): one Gleam codebase typed end-to-end.
- The desktop shell is **Tauri** (per ADR-0008). It supervises the BEAM child process.
- Build is **Nix flakes** for reproducibility (per ADR-0011), with PowerShell scripts as the Windows convenience path.

## Workflow

### 1. Pick something to work on

- An open issue tagged `good first issue`, `help wanted`, or `M0`/`M1`/`M2`/`M3`/`M4` matching the current milestone.
- A bug you found.
- A feature from `SPECIFICATION.md` §6 marked Should/Could that's not yet implemented.

For substantive changes, **open an issue first** to align on direction. For ADR-required changes (see [`docs/architecture/adr-0001-record-architecture-decisions.md`](architecture/adr-0001-record-architecture-decisions.md)), open the ADR PR first; implementation follows in a separate PR.

### 2. Branch

```bash
git checkout -b feat/short-name
```

Naming:
- `feat/<name>` — new feature.
- `fix/<name>` — bug fix.
- `docs/<name>` — documentation only.
- `refactor/<name>` — internal rework with no behaviour change.
- `chore/<name>` — tooling, dependencies, CI.
- `adr/NNNN-name` — ADR-only PR.

### 3. Code

Use the dev loop:

```powershell
just dev   # hot reload
just test  # run the suite
just check # type-check + clippy
just fmt   # format Gleam + Rust
```

Run `just fmt && just check && just test` before pushing.

### 4. Commit

- Imperative mood: "add port heartbeat" not "added".
- One concern per commit.
- The body explains *why*, not *what* (the diff shows what).
- Link issues with `#123` in the body, never in the subject.

### 5. PR

- Title is one short sentence. PR description explains the *why*.
- Tag with the milestone label and the area label (`area:beam-core`, `area:sidecars`, `area:frontend`, `area:docs`, `area:ci`).
- Link to the issue (`Closes #123`) and any related ADR.
- Include a "Test plan" section in the description.
- For UI changes, attach a screenshot or short screen recording.

### 6. Review

- Two maintainer approvals for security-sensitive areas (see `../.github/CONTRIBUTING.md`).
- One approval for everything else.
- CI must be green.
- Dismiss stale approvals on substantive force-push (rare; prefer additional commits during review).

## What goes in code vs. docs vs. ADRs

| Concern | Goes in |
|---|---|
| Why we made an architectural choice | An ADR |
| What a function does | The function's name + signature; rarely a comment |
| A subtle invariant / non-obvious gotcha | A comment immediately above the relevant line |
| The shape of a public API | rustdoc / Gleam doc comment |
| The protocol on the wire | `docs/protocols/<protocol>.md` + the CDDL/WIT in `proto/` |
| The plugin contract | `docs/plugins/contract.md` + `proto/plugin.wit` |
| The data model | The schema migration in `surreal_port` + the type definitions in `apps/core` |

Default to writing no comments. The naming + tests should make the code self-explanatory. If you find yourself writing a long comment, ask whether the *code* could change to make the comment unnecessary.

## Common patterns

### Adding a new BEAM-side actor

1. Decide where it lives in the supervision tree (`apps/core/src/mycelium/sup.gleam`). Most concerns belong under an existing supervisor; rare new top-level concerns warrant a new supervisor.
2. Implement as `gleam_otp/actor`. Public API: `start_link`, plus a function per message type.
3. Internal state lives in a record type at the top of the module.
4. Tests in `apps/core/test/` — one test file per actor. Use the Gleam stdlib's `gleeunit`.

### Adding a new sidecar method

1. Update `proto/port.cddl` if the envelope shape changes (rare).
2. Add the method to the per-sidecar table in `docs/protocols/port.md`.
3. Implement in the Rust sidecar's `dispatch` function.
4. Implement in the BEAM-side actor's public API.
5. Smoke test: round-trip the new method via a unit test in `apps/core/test/`.

### Adding a new editor block kind (M0)

1. Add a constructor to the `Block` type in `apps/core/src/mycelium/document/block.gleam`.
2. Add a renderer in `apps/core/src/mycelium/views/block.gleam`.
3. Update the slash-command menu in `apps/core/src/mycelium/views/editor.gleam`.
4. Update the migration if the storage shape changes (`sidecars/surreal_port/src/main.rs`).
5. Test: `apps/core/test/document_test.gleam`.

### Adding a new ADR

1. `cp docs/architecture/adr-template.md docs/architecture/adr-NNNN-short-title.md` (next number).
2. Fill out: Status (`Proposed`), Date, Authors, Reviewers, Context, Decision, Consequences.
3. Open a PR labelled `adr`.
4. Discuss in the PR. On consensus, change Status to `Accepted` and merge.
5. Implementation follows in a separate PR that references the ADR.

## Performance work

Performance regressions are gated in CI: a benchmark suite runs on every PR; > 10% regression on any tracked metric blocks merge (per `SPECIFICATION.md` NFR-PERF, gating row).

Tracked metrics live in `tests/perf/`. To add a new tracked metric:

1. Add a benchmark to `tests/perf/`.
2. Add the metric to the gate config in `infra/ci/perf-gate.yml`.
3. Document the baseline value (M1 MacBook Air, 16 GB RAM) in `tests/perf/README.md`.

## Security work

Security-sensitive modules (per `../.github/CONTRIBUTING.md`) require two maintainer reviews. Additionally:

- Cryptographic changes require an ADR.
- Wire-protocol changes require updating `docs/protocols/wire.md` *first*, in a PR reviewed by a maintainer with security focus, before implementation.
- New dependencies in security-sensitive modules require a justification in the ADR or PR description.
- Vulnerability disclosures follow `../.github/SECURITY.md` — never open a public issue.

## Documentation work

Documentation PRs follow the same review process as code PRs but are typically faster to land.

When updating documentation:
- Keep the line "single source of truth" in mind: `MYCELIUM.md` for architecture, `SPECIFICATION.md` for requirements, ADRs for decisions, this guide for process. Avoid duplicating content; cross-link.
- Use sentence-case headings.
- Use markdown tables sparingly — if a table is 5+ columns, restructure as a list.
- Code examples should be runnable, or clearly marked as pseudo-code.

## Translation

i18n is integrated from M0 (NFR-LOC-01). Strings live in `apps/core/src/mycelium/i18n/`.

To add a translation:
1. Copy `apps/core/src/mycelium/i18n/en.gleam` to `xx.gleam` (your language code).
2. Translate every string. Do not leave English fallbacks in place — missing keys are caught by CI.
3. Add the language to the picker in the settings panel.
4. Open a PR. Translation PRs are merged on a single maintainer approval.

## Releases

Releases are cut by the maintainer team. The process is:

1. Update the milestone status table in `README.md`.
2. Tag the release commit: `v0.X.Y`.
3. CI builds artifacts via the Nix flake and publishes them.
4. Sign the manifest of artifact hashes (per FR-DEPLOY-04, NFR-SEC-06).
5. Publish the release notes.

## Communication

- General questions: GitHub Discussions (when the repo is public).
- Bug reports: GitHub Issues with the `bug` label.
- Feature requests: GitHub Issues with the `enhancement` label, or an RFC for substantive ones.
- Security disclosures: see [`../.github/SECURITY.md`](../.github/SECURITY.md).
- Code of Conduct: see [`../.github/CODE_OF_CONDUCT.md`](../.github/CODE_OF_CONDUCT.md).

## Thanks

Mycelium exists because of contributors. Every PR — even a typo fix — moves the project forward.
