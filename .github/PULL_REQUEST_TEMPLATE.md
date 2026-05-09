## Summary

One or two sentences describing the change.

## Spec / ADR / Issue references

- Resolves #
- Implements `SPEC §`
- Per `ADR-`

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor (no behavioural change)
- [ ] Documentation
- [ ] Chore / tooling
- [ ] RFC follow-up (link the merged RFC issue)

## Test plan

- [ ]
- [ ]
- [ ]

## Quality checklist

- [ ] `cargo fmt`, `gleam format` clean
- [ ] `cargo clippy --workspace --all-targets -- -D warnings` clean
- [ ] `cargo test --workspace` and `gleam test` pass
- [ ] Documentation updated (`README.md`, `../docs/SETUP.md`, ADRs, threat model) where the change affects them
- [ ] No secrets, tokens, or personal paths in the diff
- [ ] No tracked build artefacts (`target/`, `_build/`, `dist/`, `node_modules/`) in the diff

## Security-sensitive paths

If this PR touches `sidecars/{loro_port,iroh_port,crypto_port,wasmedge_port}`, `apps/core/src/mycelium/{crypto_server,identity_server,network,sync,storage/at_rest}`, `proto/`, or `docs/threat_model.md`, a second maintainer review is required (`SPEC §13.3`). Confirm:

- [ ] Not security-sensitive, or
- [ ] CODEOWNERS reviewer requested.
