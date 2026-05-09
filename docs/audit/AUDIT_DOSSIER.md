# Mycelium — External Cryptographic Audit Dossier

This dossier collects everything an external cryptography auditor needs to evaluate Mycelium's cryptographic architecture before the 1.0 release.

**Status**: ready for audit. No external auditor engaged yet.

---

## 1. Scope of audit requested

| Concern | What to audit | Where it lives |
|---|---|---|
| **Identity model** | Per-device Ed25519 generation, OS keychain storage, ring membership signing | `apps/core/src/mycelium/identity_server.gleam`, `sidecars/crypto_port/src/main.rs` (ed25519_*, keyring_*) |
| **Pairing protocol** | SPAKE2 implementation, session lifecycle, replay/MITM resistance | `sidecars/crypto_port/src/main.rs` (spake2_*), `apps/core/src/mycelium/network/pairing.gleam` |
| **At-rest encryption** | age recipient design, RocksDB SST file wrapping, key derivation from device key | `apps/core/src/mycelium/storage/at_rest.gleam`, `sidecars/crypto_port/src/main.rs` (age_*) |
| **Op-log encryption** | age envelope per CRDT op, ring DEK rotation on revocation | `apps/core/src/mycelium/sync/sync_engine.gleam`, `sidecars/crypto_port/src/main.rs` |
| **Wire-protocol authentication** | TLS 1.3 over QUIC mutual auth via Ed25519 device keys, member certificates | `sidecars/iroh_port/src/main.rs`, `docs/protocols/wire.md` |
| **Plugin signing & verification** | BLAKE3 hash verification, Ed25519 author signature, manifest schema validation | `sidecars/wasmedge_port/src/main.rs`, `plugins/manifest_schema.json` |
| **Sandbox containment** | Wasmtime memory isolation, fuel limits, capability-based imports | `sidecars/wasmedge_port/src/main.rs` |
| **Backup/restore** | Encrypted database export, key escrow considerations | `apps/cli/src/mycelium_cli.gleam` (backup subcommand — M3 work) |

## 2. Cryptographic primitives in use

All primitives are standardized and have multiple independent implementations.

| Primitive | Use | Library | Spec |
|---|---|---|---|
| **Ed25519** | Device identity, ring identity, member certificates, plugin signatures | `ed25519-dalek 2.1` | RFC 8032 |
| **X25519** | Key agreement (inside `age`) | `x25519-dalek 2.0` | RFC 7748 |
| **ChaCha20-Poly1305** | AEAD (inside `age`) | `chacha20poly1305 0.10` | RFC 7539, RFC 8439 |
| **BLAKE3** | Content addressing (blobs, plugin binaries, op-log chunks, snapshots) | `blake3 1.5` | https://github.com/BLAKE3-team/BLAKE3-specs |
| **age** | At-rest encryption + op-log envelope encryption | `age 0.11` | https://age-encryption.org/v1 |
| **SPAKE2** | Password-authenticated key exchange for remote pairing | `spake2 0.4` (Ed25519 group) | RFC 9382 |
| **TLS 1.3 over QUIC** | Wire transport (delegated to Iroh) | `iroh 0.92` (which uses `quinn`/`rustls`) | RFC 9000, RFC 8446 |

**No first-party C/C++ code.** Per `../SPECIFICATION.md` C-07 and NFR-SEC-07, all first-party code is in memory-safe languages (Rust + Gleam).

## 3. Key lifecycle

### Device key
- **Generation**: `crypto_server.ed25519_generate` on first boot (via `crypto_port` sidecar; uses `OsRng`).
- **Storage**: OS keychain only — Windows Credential Manager (`keyring 3.6` `windows-native`), macOS Keychain (`apple-native`), Linux Secret Service (`linux-native-sync-persistent`).
- **Loading**: `identity_server.start_link_with` calls `crypto_server.keyring_get` at boot. If absent, generates fresh and stores via `keyring_set`.
- **In-memory exposure**: held in BEAM process state. **Never written to disk in plaintext** (confirms NFR-SEC-02).
- **Use**: signs member certificates, signs operation envelopes, serves as TLS certificate via Iroh.

### Ring identity key
- **Generation**: created by the device that establishes the ring. Per `../MYCELIUM.md` §11, held by the originator.
- **Distribution**: never transmitted in plaintext. New devices receive a member certificate signed by the ring key, not the ring key itself.
- **Audit recommendation**: confirm that the QR-code pairing flow displays the ring key only encrypted under a one-time PIN (M3 UI work — current beta uses SPAKE2 instead).

### Ring data-encryption key (DEK)
- **Generation**: derived from the ring identity at ring creation; rotated on revocation.
- **Storage**: in-memory only on each ring member device.
- **Use**: age recipient for op-log envelope encryption and at-rest encryption of attachments.
- **Rotation**: per `FR-CRYPTO-06`, on revocation a new DEK is generated; future operations encrypted under the new DEK; past operations remain readable to whoever already had them.

### Plugin author keys
- **Generation**: `mycelium-cli plugin keygen` (post-M2).
- **Storage**: author's responsibility (typically a file under `~/.config/mycelium/author.key`).
- **Use**: signs plugin manifests; users see the public key during install.

## 4. Threat model

The complete document is at [`docs/threat_model.md`](../threat_model.md). Summary table for quick auditor reference:

| Adversary | In scope | Out of scope |
|---|---|---|
| Passive network observer | Cannot read content | Traffic analysis (pattern correlation) |
| Active MITM | Cannot impersonate or inject ops | DoS via packet drops |
| Compromised relay | Sees ciphertext only | Selective message dropping |
| Stolen device, screen-locked | Disk encryption + OS keychain protect | OS-level protection assumed |
| Stolen device, unlocked | Out of scope (OS responsibility) | — |
| Compromised endpoint with root | Out of scope (cannot defend) | — |
| Malicious plugin | Capability-bounded; can exfiltrate granted subgraph | Plugin discretion limited only by capability set |
| Lost device, attacker has full control | Revocation prevents future sync | No remote wipe |
| Compromised dependency | Pinned via Cargo.lock + Nix flake; audit-required | Zero-day in pinned version |

## 5. Protocol specifications (audit-readable)

- **Port protocol**: [`docs/protocols/port.md`](../protocols/port.md) — line-framed JSON in v1.0; CDDL schema in [`proto/port.cddl`](../../proto/port.cddl).
- **Wire protocol**: [`docs/protocols/wire.md`](../protocols/wire.md) — CBOR over QUIC streams; CDDL schema in [`proto/wire.cddl`](../../proto/wire.cddl). Three-phase handshake: hello → auth-challenge/response → vv-announce → op-batch.
- **Plugin contract**: [`docs/plugins/contract.md`](../plugins/contract.md) — WIT IDL in [`proto/plugin.wit`](../../proto/plugin.wit), JSON-Schema for manifests in [`plugins/manifest_schema.json`](../../plugins/manifest_schema.json).

## 6. Cryptographic ADRs

The Architecture Decision Records that justify each cryptographic choice:

- [ADR-0003 Sidecars not NIFs](../architecture/adr-0003-sidecars-not-nifs.md) — fault isolation rationale
- [ADR-0009 age + BLAKE3 for cryptography](../architecture/adr-0009-age-and-blake3-for-cryptography.md) — primitive selection rationale
- [ADR-0011 Nix flakes for reproducibility](../architecture/adr-0011-nix-flakes-for-reproducibility.md) — build-chain integrity

## 7. Source-of-truth file inventory

A pinned commit + per-file SHA256 list will be generated at audit-engagement time via `scripts/audit_inventory.ps1`. Each crypto-relevant file is listed below for the auditor to load the fixed-version snapshot:

```
sidecars/crypto_port/src/main.rs
sidecars/iroh_port/src/main.rs
sidecars/wasmedge_port/src/main.rs
sidecars/surreal_port/src/main.rs
apps/core/src/mycelium/identity_server.gleam
apps/core/src/mycelium/crypto_server.gleam
apps/core/src/mycelium/network/pairing.gleam
apps/core/src/mycelium/network/iroh_port.gleam
apps/core/src/mycelium/network/peer_registry.gleam
apps/core/src/mycelium/network/backpressure.gleam
apps/core/src/mycelium/sync/sync_engine.gleam
apps/core/src/mycelium/sync/compaction.gleam
apps/core/src/mycelium/storage/at_rest.gleam
apps/core/src/mycelium/storage/surreal_port.gleam
apps/relay/src/main.rs
proto/port.cddl
proto/wire.cddl
proto/plugin.wit
plugins/manifest_schema.json
docs/threat_model.md
docs/protocols/port.md
docs/protocols/wire.md
docs/plugins/contract.md
```

## 8. Build reproducibility

Per `FR-DEPLOY-04`, two builds of the same commit must produce byte-identical binaries.

- **Build entry point**: `flake.nix` at the repo root.
- **Reproducibility check** (`infra/ci/check.yml`, `reproducibility` job): `nix build .#relay` twice, compare `sha256sum` of `bin/mycelium-relay`. Currently gated on `main` push events.

The auditor can run this themselves:
```bash
nix build .#relay --out-link result-1
nix build .#relay --out-link result-2
diff -r result-1 result-2
```

## 9. Vulnerability surveillance

`infra/ci/check.yml` runs `cargo audit --deny warnings` on every PR. Severe vulnerabilities block merge.

The auditor should also run:
- `cargo audit` against `Cargo.lock`
- `gleam deps list` and review each Hex package
- `npm audit` against `tests/smoke/package.json`

## 10. Engagement checklist for the auditor

Before signing off (per `NFR-SEC-04` acceptance criterion + `../SPECIFICATION.md` §11):

- [ ] All Critical and High findings resolved
- [ ] CVSS 4.0 scoring assigned to each finding
- [ ] Disclosure schedule agreed per `../../.github/SECURITY.md` (90-day window default)
- [ ] Joint advisory drafted for any cross-project upstream issues
- [ ] Sign-off appended to `docs/threat_model.md` (per `E.8` in todo_base)

## 11. Out-of-scope clarifications for the auditor

- **Quantum resistance**: Ed25519 / X25519 are not post-quantum. Migration to PQ-resistant primitives is post-1.0 (tracked as `roadmap.md` "Beyond 1.0").
- **Forward secrecy at rest**: explicitly not provided. A device key compromise lets an attacker decrypt all past stored ciphertext on that device. See `docs/threat_model.md` "Out-of-scope attack classes" §11.
- **Plugin discretion**: the sandbox bounds *what* a plugin can access (capabilities), not *how* it uses the data it can see. A plugin granted both `subgraph(read)` and `http(<host>)` can exfiltrate the subgraph to that host — the user is informed of this combination at install.
- **OS-level attacks**: a keylogger on the unlocked endpoint is out of scope. Mycelium relies on OS-level user authentication.

## 12. Contact

- Code lead: see `../MAINTAINERS.md`
- Security disclosure address: see `../../.github/SECURITY.md`
- Audit coordination: open a private channel before engagement.
