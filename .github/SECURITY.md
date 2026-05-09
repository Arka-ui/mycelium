# Security policy

Mycelium handles user content end-to-end encrypted by default. The project takes vulnerability reports seriously.

## Reporting a vulnerability

**Do not open a public GitHub issue for suspected vulnerabilities.** Report privately by email:

> security@mycelium.invalid *(placeholder — to be replaced before 1.0)*

Include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, if applicable.
- The version of Mycelium and the platform you tested against.
- Whether you intend to disclose publicly, and on what timeline.
- (Optional) Your PGP key if you want an encrypted reply.

You will receive an acknowledgement within **72 hours**.

## Disclosure timeline

The default disclosure window is **90 days** from initial report. The maintainer team and the reporter agree on the public disclosure date during the triage.

If a fix is released before 90 days, public disclosure happens with the fix release. If a fix requires more time, an extension is negotiated with the reporter. The maintainers reserve the right to disclose earlier if the vulnerability is being actively exploited in the wild.

## Scope

In scope (please report):

- Cryptographic weakness in the device-key, ring-key, or operation-log encryption.
- Bypass of the plugin sandbox (capability escape, host process compromise, KV namespace leakage).
- Bypass of the at-rest encryption (read user content from disk without the device key).
- Authentication bypass on the peer wire protocol (impersonation, replay, downgrade).
- Code execution via crafted inbound CRDT operations or malformed sidecar responses.
- Code execution via crafted plugin manifests or signed plugin binaries.
- Memory-safety issues in any first-party Rust sidecar.
- Resource exhaustion that survives backpressure (e.g., a peer can crash a victim's BEAM with bounded local memory).

Out of scope (do not report):

- Vulnerabilities requiring a compromised endpoint with root access (the threat model excludes this — see [`docs/threat_model.md`](docs/threat_model.md) §"Out of scope").
- Social-engineering attacks that require the user to manually approve a malicious plugin or accept a malicious ring invitation.
- Vulnerabilities in third-party plugins outside the official reference set.
- Issues in test fixtures or example code that are not shipped to end users.
- Self-XSS or vulnerabilities requiring physical access to an unlocked device.

## Severity rating

We use the **CVSS 4.0** rating system for triage. Critical and High findings (CVSS ≥ 7.0) block the next release. Medium findings target the following minor release. Low findings are scheduled into a maintenance window.

## Coordinated disclosure with upstream

If the vulnerability is in an upstream dependency (Erlang/OTP, Gleam, Loro, Iroh, SurrealDB, Tauri, WasmEdge, age, BLAKE3), we coordinate with that project's security team and align on disclosure. The reporter is named in the joint advisory unless they request anonymity.

## Hall of fame

We maintain a list of researchers who have responsibly disclosed vulnerabilities at `docs/security/hall_of_fame.md` (created with the first valid report). Inclusion is opt-in.
