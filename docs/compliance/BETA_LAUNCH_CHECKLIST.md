# Beta-launch checklist

This is the operational checklist for cutting the **first beta release** (v0.1.0-beta.1). Items already complete are checked. Items marked 🟢 require an action by an external party (auditor, signing-cert vendor, baseline-hardware owner). Items marked 🔵 are achievable by a maintainer with the relevant build host.

## Engineering

- [x] All M0 items in `todo_base.md` complete
- [x] All M1 items complete
- [x] M2: 12/13 items complete (CBOR migration deferred to v1.1)
- [x] M3 production polish: 11/16 items complete (5 require non-Windows build hosts)
- [x] Cross-cutting: 8/8 done (i18n, a11y, gates, vuln scan)
- [x] `cargo check --workspace` green
- [x] `gleam test` 19/19 pass
- [x] All sidecars build release: `surreal_port`, `loro_port`, `iroh_port`, `crypto_port`, `fastembed_port`, `wasmedge_port`, `mycelium-relay`
- [x] Wasm reference plugins built: `translate`, `ical_import`
- [x] Tauri externalBin wired with target-triple-suffixed binaries

## Documentation

- [x] `../MYCELIUM.md` (architecture)
- [x] `../SPECIFICATION.md` (SRS)
- [x] 12 ADRs in `docs/architecture/`
- [x] Protocol specs (port + wire)
- [x] Plugin contract + SDK reference
- [x] Threat model
- [x] Audit dossier (`docs/audit/AUDIT_DOSSIER.md`)
- [x] mdBook config (`docs/book.toml`, `docs/SUMMARY.md`)
- [x] Requirements ↔ test traceability matrix
- [x] NFR baseline document with metric definitions
- [x] Plugin community index schema + bootstrap

## CI / Release

- [x] `infra/ci/check.yml` (Linux/Windows/macOS, Rust + Gleam + Wasm + coverage + audit + reqs gate + perf gate)
- [x] `infra/ci/release.yml` (4-target tag-triggered)
- [x] `infra/ci/soak.yml` (weekly cron)
- [x] `infra/ci/requirements_gate.py` traceability
- [x] `infra/ci/perf_gate.py` regression gate
- [x] `scripts/audit_inventory.ps1` (per-file SHA-256 inventory)
- [x] `scripts/verify_reproducibility.ps1` (Nix dual-build comparison)

## Pre-tag actions (still to do)

- [ ] 🔵 Build `.dmg` on macOS host (D.3); attach to release artifacts
- [ ] 🔵 Build `.deb`/`.rpm`/`.AppImage` on Linux host (D.5); attach
- [ ] 🔵 First green CI run with all gates including coverage ≥ 75 % and reqs traceability passing
- [ ] 🔵 Capture NFR snapshot on baseline Apple M1 (E.6); attach to release notes
- [ ] 🔵 Run `verify_reproducibility.ps1` on a second Linux host (E.7)
- [ ] 🟢 Engage external cryptography auditor (E.1) — see `AUDIT_DOSSIER.md` §10
- [ ] 🟢 Engage external security reviewer for threat-model sign-off (E.8)
- [ ] 🟢 Acquire EV code-signing certificate (Windows installer) — ~$500/year
- [ ] 🟢 Acquire Apple Developer ID + notarization API key — $99/year
- [ ] 🟢 Acquire domain + static host for `docs.mycelium.invalid` (E.2)
- [ ] 🟢 Acquire domain + static host for plugin community index (E.3)
- [ ] 🟢 Set up `tauri-plugin-updater` endpoint (D.16)
- [ ] 🟢 Generate operator Ed25519 key pair for plugin index; publish public key with first index version
- [ ] 🟢 Generate Tauri update-signer key pair: `tauri signer generate`; populate `pubkey` in `tauri.conf.json::plugins.updater`

## Pre-launch communications

- [ ] 🟢 Beta tester recruitment list compiled
- [ ] 🟢 Discord / Matrix room created for beta testers
- [ ] 🟢 Bug-report template added to GitHub
- [ ] 🟢 First-week feedback form prepared
- [ ] 🟢 Privacy notice published (per NFR-PRIV)

## After tagging v0.1.0-beta.1

- [ ] CI release workflow produces installers for 4 targets
- [ ] Compute and publish `sha256sums.txt` and detached signatures
- [ ] Upload to GitHub Release with `release-notes.md`
- [ ] Open `BETA_FEEDBACK.md` discussion thread
- [ ] Monitor `mycelium-relay` resource usage (per NFR-PERF-06 / C-06)
- [ ] Plan v0.1.0-beta.2 cadence (default: 2 weeks)

## Status as of latest update

**69 of 79 todo_base items complete (87 %).** The remaining 10 are external (audit, hosting, cross-OS build hosts, baseline NFR validation, signing certs).

The product itself ships today on Windows. Mac and Linux builds need 5 minutes on the respective host.
