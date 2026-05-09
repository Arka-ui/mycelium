# Threat model

**Version:** 0.1.0
**Status:** Draft — to be reviewed by an external security reviewer before 1.0 (per NFR-SEC-04, acceptance criterion).
**Audience:** security auditors, contributors changing security-sensitive modules, users wanting to understand what Mycelium does and does not protect against.

This document enumerates the assets Mycelium protects, the adversaries it defends against, and the attack classes it explicitly does not defend against. It is the operational version of `MYCELIUM.md` §22, restructured for audit.

## Scope

This threat model covers the v1.0 release as defined in `SPECIFICATION.md`. Out-of-scope features (mobile clients, multi-tenant cloud, OCR over attachments) are not analysed.

## Assets

| Asset | Where it lives | Protection |
|---|---|---|
| User content (notes, attachments, edges, properties) | Local SurrealDB on each ring device, plus replicas | At-rest encryption (`age` w/ device key); E2E encryption on the wire |
| Device private key (Ed25519) | OS keychain only | OS-level access control; never written to disk in plaintext |
| Ring private key (Ed25519) | The device that created the ring | Held in OS keychain on the originating device; never transmitted in plaintext |
| Ring data-encryption key (DEK) | Each ring member device | Loaded into RAM only; rotated on revocation |
| Member certificates | All ring members | Signed by ring key; verifiable offline |
| Plugin Wasm modules | Each device | Stored encrypted; integrity verified by BLAKE3 + signature |
| Plugin KV stores | Each device | Per-plugin isolated; encrypted at rest |
| Search query history (if enabled) | Local | Encrypted at rest; deletable in one user action |

## Adversary model

We enumerate adversaries by capability tier. For each tier, we specify what they can do and what Mycelium prevents.

### A1 — Passive network observer

**Capability:** Sees encrypted packets between Mycelium peers (e.g., an ISP, a Wi-Fi snooper, a coffee-shop attacker).

| Can do | Cannot do |
|---|---|
| Identify that QUIC traffic flows between two IPs | Read content (TLS 1.3 + age E2E) |
| Time and size traffic (traffic analysis) | Identify which ring two peers belong to |
| Identify Mycelium's protocol fingerprint | Modify in-flight content |

**Mitigation:** TLS 1.3 over QUIC encrypts the wire; `age` encrypts the payload before the wire. NodeIds are random Ed25519 keys, so they don't link to user identities.

**Residual risk:** Traffic analysis is not defended against. A motivated observer correlating flows over time can deduce that two devices are talking. Onion routing or traffic shaping is out of scope (per `SPECIFICATION.md` §5.2).

### A2 — Active network attacker / MITM

**Capability:** Can intercept, modify, drop, or inject packets.

| Can do | Cannot do |
|---|---|
| Drop QUIC packets (DoS) | Forge a peer's identity (TLS authenticates Ed25519 device key) |
| Inject malformed application data | Inject valid CRDT operations (signature on operation envelope is verified) |
| Block the discovery service | Decrypt past or current traffic |

**Mitigation:** Mutual TLS using device keys; `age` per-op encryption with signature; member certificates rejected if revoked. CRDT idempotence makes message replay harmless (the receiver discards already-applied ops).

### A3 — Compromised relay

**Capability:** A relay node is fully compromised: the attacker reads all stored ciphertext and controls forwarding.

| Can do | Cannot do |
|---|---|
| Drop or reorder messages between peers | Decrypt stored or in-flight content |
| Observe metadata (which NodeIds talk via this relay) | Identify the user (NodeIds are random Ed25519 pubs) |
| Selectively withhold messages from a target | Forge a message |

**Mitigation:** Relays see ciphertext only. The CRDT layer is robust to reordering. Dropped messages are eventually retransmitted via direct P2P or via a different relay.

**Residual risk:** A compromised relay can perform a denial-of-service (selectively dropping messages between specific peers). Users are advised to run their own relay.

### A4 — Stolen device, encrypted disk, screen locked

**Capability:** The attacker has physical possession of a powered-off or screen-locked device. The disk is encrypted at the OS level and the device key is in the OS keychain (sealed without OS unlock).

| Can do | Cannot do |
|---|---|
| Try OS-level brute-force unlock (subject to OS rate limits) | Read user content without OS unlock |
| Boot the device into recovery mode (subject to OS protections) | Read the device key from the keychain without OS unlock |

**Mitigation:** OS-level disk encryption + Mycelium's at-rest encryption (`age` w/ device key). Without the OS unlock, both layers are sealed.

**Residual risk:** A user with a weak OS password is vulnerable. Mycelium does not authenticate the user beyond the OS.

### A5 — Stolen device, unlocked

**Out of scope.** If the OS is unlocked and the user is logged in, an attacker with physical access can read everything Mycelium can read. Mycelium relies on OS-level user authentication.

**Mitigation:** Recommend full-disk encryption + screen lock. Use the OS's "find my device" features. Revoke the device key remotely once the loss is detected (per A8 below).

### A6 — Compromised endpoint with root

**Out of scope.** A keylogger or root-level attacker on the user's machine sees every keystroke before encryption. Mycelium cannot defend against an attacker who controls the OS.

### A7 — Malicious plugin

**Capability:** A user installs a plugin that is hostile (intentionally exfiltrates user content via the capabilities the user granted).

| Can do | Cannot do |
|---|---|
| Read the subgraph it was granted access to | Read content outside its granted subgraph |
| Make HTTP calls to allowlisted hosts | Make HTTP calls to non-allowlisted hosts |
| Persist data in its KV store | Read another plugin's KV store |
| Abuse a `render-block` to inject HTML | Bypass the sandboxed-HTML filter (script tags stripped) |

**Mitigation:** Capability-based sandboxing enforced structurally (denied capabilities are not linked into the Wasm instance). Install prompt requires explicit user approval per capability. Reference plugins are reviewed; community plugins are surfaced with author reputation.

**Residual risk:** A plugin granted both `subgraph(read)` and `http(<host>)` can exfiltrate the subgraph to that host. The user is informed of this combination at install. Capability minimisation is the only defense; the OS-level analogy is "you installed a network-enabled app that can read your files; it can upload them."

### A8 — Lost device, attacker has full control

**Capability:** Attacker has the unlocked device. The user notices the loss and revokes the device key from another device in the ring.

| Can do | Cannot do |
|---|---|
| Read all data the device already had at the time of loss | Sync new data after the revocation propagates |
| Exfiltrate data while the device is online (until network is severed) | Re-join the ring under the same device key |

**Mitigation:** Revocation propagates via the ring's signed log. Future sync rejects the lost device. **Mycelium does not provide remote wipe** (the lost device may be offline when revocation is issued).

**Residual risk:** Pre-revocation data on the lost device is not recoverable. Sensitive workflows should pair Mycelium with OS-level remote-wipe (Find My Mac, Microsoft Find My Device, etc.).

### A9 — Compromised dependency / supply chain

**Capability:** A library Mycelium depends on (Loro, Iroh, SurrealDB, fastembed, WasmEdge, age, BLAKE3) ships a backdoored version.

| Can do | Cannot do |
|---|---|
| Affect a specific Mycelium release | Affect builds pinning a prior version |

**Mitigation:** All dependencies are content-addressed via `Cargo.lock` and the Nix flake. Reproducible builds (per ADR-0011) allow third-party verification. Dependency vulnerability scanning runs on every CI pipeline (NFR-SEC-05). New dependencies require a justification ADR.

**Residual risk:** A 0-day in a pinned version is exposed until a patch + version bump + reproducible-build verification cycle completes. Users are advised to enable auto-update for the security branch (when M4 ships the auto-update system).

### A10 — Forced disclosure / legal compulsion

**Capability:** A government or legal entity compels a maintainer or relay operator to disclose user data.

| Can do | Cannot do |
|---|---|
| Demand source code (already public per AGPL-3.0) | Compel decryption of user content (the maintainer does not hold any user's keys) |
| Demand relay logs (ciphertext only) | Decrypt the relay logs |
| Compel the project to ship a malicious update | Avoid detection (reproducible builds reveal the change) |

**Mitigation:** No maintainer holds any user's keys. Relays see ciphertext. Reproducible builds expose any malicious update injected into the official release.

**Residual risk:** A compelled update could backdoor *future* installations and updates. Users running auto-update would receive it. The defenses are: enable signed-update verification, watch for community alarm bells (the build no longer reproduces), and use distribution mirrors with independent verification.

## Out-of-scope attack classes

Restated for clarity:

- **Stolen unlocked device** (A5): OS responsibility.
- **Compromised endpoint with root** (A6): OS responsibility.
- **Forward secrecy of stored content**: stored ciphertext can be decrypted with the device key. Continuous re-encryption is infeasible at storage scale.
- **Traffic analysis at scale**: a global passive observer can correlate Mycelium flows. Onion routing is not implemented.
- **Plugin-level exfiltration via granted capabilities** (A7): capability minimisation is the only defense.
- **Quantum adversaries**: Ed25519 and X25519 are not post-quantum-secure. A migration to PQ-resistant primitives is post-1.0 work.

## Defenses by component

| Component | Defense |
|---|---|
| Identity | Ed25519 key in OS keychain; never on disk plaintext |
| Ring membership | Signed log; revocation propagates as a CRDT op |
| Wire transport | Iroh-managed TLS 1.3 over QUIC; mutual auth |
| Op-level encryption | `age` to ring DEK; relays see ciphertext only |
| At-rest | `age` to device key for SurrealDB file; same for attachments and plugin code |
| Plugin sandbox | WasmEdge linear-memory isolation; capability-based imports |
| Build pipeline | Nix flake reproducible builds; signed releases (M4) |

## Audit checklist

Audit-ready artifacts:

- [`MYCELIUM.md`](MYCELIUM.md) §11 (cryptographic model)
- [`docs/protocols/wire.md`](protocols/wire.md) (peer wire protocol)
- [`docs/protocols/port.md`](protocols/port.md) (port protocol)
- [`docs/plugins/contract.md`](plugins/contract.md) (plugin sandbox contract)
- [`proto/wire.cddl`](../proto/wire.cddl), [`proto/port.cddl`](../proto/port.cddl), [`proto/plugin.wit`](../proto/plugin.wit) — formal schemas
- [`LICENSES.md`](LICENSES.md) — dependency inventory
- This document

## Reporting a vulnerability

See [`../.github/SECURITY.md`](../.github/SECURITY.md). Default disclosure window: 90 days.
