# ADR-0013 — Python for CI helper scripts

## Status

Accepted (M0).

## Context

The CI pipeline needs three pieces of glue logic that do not fit cleanly into a build tool:

1. Parse `cargo bench` output and compare benchmark numbers against a JSON baseline (`infra/ci/perf_gate.py`).
2. Verify the SPECIFICATION → implementation traceability matrix exists for every `Must` requirement (`infra/ci/requirements_gate.py`).
3. Future helpers in the same shape (release-note generation, badge emission, lockfile checks).

The constraint `SPEC §8 C-07` forbids C and C++ for first-party code but is silent on scripting languages used only at build time.

The candidate languages were:

- **Bash.** Universal on Linux/macOS, fragile on Windows (CI matrix runs on Windows too). Quoting and JSON parsing in pure bash are unpleasant.
- **Python.** Universal on the GitHub Actions runners (already preinstalled). Standard library covers JSON, regex, subprocess, pathlib. No extra runtime install on CI.
- **Rust (`cargo xtask` pattern).** Adds CI compile time on every run unless cached aggressively. Heavyweight for ~100-line scripts.
- **Gleam (`escript`).** Adds a Gleam build step before any helper can run; circular dependency with the Gleam test job.

## Decision

Use Python 3.12 for CI helper scripts under `infra/ci/`. Pin the version in `.github/workflows/ci.yml` so CI is reproducible.

Forbid Python in the application runtime, in `apps/`, `sidecars/`, `plugins/`, or `proto/`. Tooling lives only under `infra/`.

## Consequences

- Contributors do not need Python locally to build or run Mycelium; only CI does.
- The Python files are clearly marked with `#!/usr/bin/env python3` and `from __future__ import annotations`, and pass `python -m py_compile` in CI as a smoke test.
- If the helper count grows, or if we later want to invoke them locally as part of `just` recipes, the door is open to migrate them to Rust (`cargo xtask`). Migration is mechanical and trackable.
