# Peer Wire Protocol Specification

**Version:** 0.1.0 (DRAFT)
**Status:** Implementation is M1 work — this spec exists today so the protocol can be reviewed before code lands.
**Schema:** `proto/wire.cddl`
**Audience:** sync implementers, security auditors, contributors building independent clients.

This document specifies the on-the-wire protocol exchanged between two Mycelium devices in the same ring. The transport is QUIC, provided by Iroh (per ADR-0005). Each Mycelium peer-to-peer session uses one or more QUIC streams; each stream carries CBOR-encoded envelopes defined by `proto/wire.cddl`.

## Connection establishment

1. Peer A discovers peer B's `NodeId` via mDNS, DNS-SD, or ring gossip (per `../MYCELIUM.md` §10).
2. Peer A asks Iroh to open a QUIC connection to B. Iroh performs hole-punching, optionally via a relay. The QUIC handshake authenticates B's Ed25519 device key as the TLS certificate.
3. Once the QUIC connection is up, both peers open a **control stream** (stream ID 0) and one or more **data streams**.

## Phase 1 — Application-level handshake

On the control stream, both peers immediately exchange `hello` envelopes:

```
hello {
    type: "hello",
    protocol: "mycelium-wire",
    version: 1,
    node-id: <Ed25519 pub>,
    ring-id: <Ed25519 pub>,           // the ring's identity public key
    nonce: <32 bytes>,
    capabilities: ["snapshots", "blobs", "ops-v1"]
}
```

Then each peer sends an `auth-challenge` containing a 32-byte nonce. The other peer replies with an `auth-response`:

```
auth-response {
    type: "auth-response",
    signature: <Ed25519 sig over (challenge-nonce || hello-nonce)>,
    member-cert: {
        device-pub: <Ed25519 pub>,
        issued-at: <unix epoch s>,
        issued-by: <ring pub>,
        not-after: <unix epoch s>,
        cert-signature: <Ed25519 sig over the previous fields>
    }
}
```

The verifier checks:
- `member-cert.cert-signature` is valid under `member-cert.issued-by` (the ring key).
- `member-cert.issued-by` equals the ring identity expected for this connection.
- `member-cert.not-after` ≥ now.
- `signature` is valid under `member-cert.device-pub` over the nonce concatenation.
- `member-cert.device-pub` is **not** in the ring's revocation log.

If any check fails, the connection is closed with QUIC application error `0x01` (`auth_failed`).

## Phase 2 — Version-vector exchange

Both peers send `vv-announce` for every document they know:

```
vv-announce {
    type: "vv-announce",
    docs: { <doc-id> => <version-vector> }
}
```

A `version-vector` is `{ <device-id> => <lamport> }`. Each peer computes the per-document delta: which Lamport timestamps the other side is missing. This drives Phase 3.

## Phase 3 — Operation transfer

Each peer sends `op-batch` envelopes containing the missing operations:

```
op-batch {
    type: "op-batch",
    doc-id: <ULID>,
    ops: [
        {
            lamport: <uint>,
            author: <device-id>,
            dek-id: <uint>,                 // ring data-encryption-key generation
            ciphertext: <bytes>             // age-encrypted Loro op bytes
        },
        ...
    ],
    seq-from: <uint>,
    seq-to: <uint>,
    compressed: <bool>                      // zstd if true
}
```

The receiver decrypts each op (the dek-id maps to a ring DEK held by ring members), applies it to its Loro instance via `loro_port.apply_remote_ops`, and on success sends an `ack` covering the batch:

```
ack { type: "ack", doc-id: <ULID>, upto: <seq-to> }
```

If decryption or application fails, the receiver closes the data stream with QUIC application error `0x02` (`op_apply_failed`). The control connection survives.

## Snapshots

When a peer's missing range is older than the stable version vector (the version every device in the ring has acknowledged), the sender offers a snapshot instead of streaming individual ops:

```
snapshot-offer  { type: "snapshot-offer", doc-id, snap-hash, size, chunks }
snapshot-chunk  { type: "snapshot-chunk", doc-id, snap-hash, index, payload }
```

The chunks form a BLAKE3-tree-verified blob (the same format as attachment blobs). Once all chunks are received and the BLAKE3 tree validates, the receiver loads the snapshot via `loro_port.load_snapshot` and proceeds to ingest any newer ops on top.

## Attachment transfer

Attachments are content-addressed by BLAKE3 hash. When a peer sees a CRDT op referencing a blob hash it doesn't have:

```
blob-request { type: "blob-request", blob-hash }
blob-chunk   { type: "blob-chunk", blob-hash, index, last, payload }
```

Each chunk is verified against the BLAKE3 tree as it arrives. A complete blob is stored in the peer's local attachment store.

## Backpressure

Every receiver tracks a credit budget per data stream and grants credits to the sender:

```
grant-credit { type: "grant-credit", credits, rtt-us }
```

A sender that runs out of credits pauses transmission until more are granted. RTT is reported so senders can size in-flight batches appropriately. This prevents a slow phone from causing a desktop's send buffer to grow unbounded (FR-SYNC-08).

## Disconnect

Either side may send `bye` with a reason string before closing:

```
bye { type: "bye", reason: "shutdown" }
```

The receiver closes its end of all streams. Subsequent sync resumes from the last acknowledged Lamport timestamp.

## Error codes

QUIC application errors used by the protocol:

| Code | Meaning |
|---|---|
| `0x00` | Normal close |
| `0x01` | Auth failed (revoked, expired, malformed certificate, signature invalid) |
| `0x02` | Op apply failed (decryption error, CRDT integrity error) |
| `0x03` | Protocol violation (envelope decode error, unknown type) |
| `0x04` | Resource exhaustion (credit limit exceeded with no grant in flight, message size > 16 MiB) |
| `0x05` | Unsupported version |

## Threat properties

- All envelopes are end-to-end encrypted at the application layer (`age` over the ring's data-encryption key) **and** at the transport layer (QUIC TLS 1.3). The relay (when used) sees only ciphertext.
- A revoked member's signature is rejected during the handshake; future sessions cannot be established. Past data exchanged before revocation remains decryptable by the revoked member (no remote wipe — see `docs/threat_model.md`).
- Forward secrecy applies on the wire (per QUIC), not at rest.
- Replay protection: the handshake nonces are 32 random bytes per session; signatures bind the nonce to the session. Op-level replay would only re-apply already-known operations (CRDT idempotence), but sequence numbers in `op-batch` make replays detectable.
