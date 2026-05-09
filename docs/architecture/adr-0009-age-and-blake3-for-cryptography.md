# ADR-0009 — `age` and BLAKE3 for cryptography

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team, security reviewers

## Context

Mycelium needs:

- **Identity** — a per-device key pair, used as the QUIC certificate and as the basis for ring membership.
- **Authenticated encryption** — for ops on the wire and for stored ciphertext.
- **Content-addressable hashing** — for blobs, plugin binaries, snapshots.
- **Multi-recipient encryption** — encrypt one payload to N device public keys.
- **Forward secrecy** — at least on the wire.

The cryptographic primitives chosen must be:

- Standardized and widely implemented (NFR-SEC-01).
- Conservative (no novel constructions).
- Fast on commodity hardware (NFR-PERF — search and sync paths must not be cryptography-bound).

## Decision

The primitives:

- **Ed25519** for identity (device keys, ring keys, member certificates, plugin signatures).
- **X25519** for key agreement (used internally by `age`).
- **ChaCha20-Poly1305** for AEAD (used internally by `age`).
- **BLAKE3** for all content-addressed hashes (blobs, plugin binaries, op-log chunks, snapshot identities).
- **TLS 1.3 over QUIC** for transport, with the device key serving as the certificate (Iroh provides this).

The format choices:

- ***`age`*** for at-rest encryption of the SurrealDB file and attachments, and for the per-op encryption that wraps each CRDT op before transmission.

`age` was chosen over OpenPGP for three reasons: it is a much smaller specification (auditable in an afternoon), it uses modern primitives (X25519 + ChaCha20-Poly1305), and its multi-recipient model maps cleanly to "encrypt to all current ring members."

BLAKE3 was chosen over SHA-256 for two reasons: it is faster (relevant for streaming blob verification), and its tree structure permits chunk-level verification without holding the entire blob in memory.

## Consequences

- All cryptographic primitives are well-understood, with multiple independent implementations.
- The `age` recipient model is the natural fit for the ring-membership model — adding/removing a device is "re-encrypt to the new recipient set" with no protocol change.
- BLAKE3's tree structure naturally interoperates with Iroh's blob transfer (which already uses BLAKE3).
- Forward secrecy on the wire is provided by TLS 1.3 (one-RTT-key-rotation per QUIC connection). Forward secrecy on stored content is *not* provided — a key compromise lets an attacker decrypt all past stored ciphertext on that device. This is documented as out-of-scope in `docs/threat_model.md` (re-encrypting all stored content on every key rotation is infeasible at the storage scale we target).
- An external cryptographic audit (NFR-SEC-04) is scheduled before the 1.0 release. The protocol specifications in `docs/protocols/` are written with audit-readability as a primary goal.

## References

- `../MYCELIUM.md` §11 (cryptographic model), §22 (threat model).
- `../SPECIFICATION.md` NFR-SEC-01 (standardized primitives), NFR-SEC-04 (external audit), FR-CRYPTO-* (functional crypto requirements).
- `age`: https://age-encryption.org / RFC-style spec at https://github.com/C2SP/C2SP
- BLAKE3: https://github.com/BLAKE3-team/BLAKE3-specs
