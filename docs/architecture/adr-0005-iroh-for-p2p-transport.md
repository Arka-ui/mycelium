# ADR-0005 — Iroh for peer-to-peer transport

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team

## Context

Devices in a ring need to find each other, establish encrypted connections, and exchange data without any central server. The transport must:

- Support **NAT traversal** (most home networks are NATted; corporate NATs are restrictive).
- Support **mutual authentication** via the device's identity key.
- Support **content-addressed blob transfer** (attachments are addressed by BLAKE3 hash; integrity verifies during streaming).
- Have a **fallback relay** path for environments where hole-punching fails, with the relay seeing only ciphertext.
- Be **embeddable in non-Rust hosts** (port boundary again).

Candidate libraries:

- **libp2p** — large, modular, broad protocol surface. We'd use a tiny slice of it. Heavy.
- **Raw QUIC + custom NAT traversal** — possible but reinvents the discovery and hole-punching wheel.
- **Iroh** — built by ex-IPFS contributors (n0). QUIC-based encrypted transport, hole-punching via STUN, optional relay, content-addressed blob transfer with progressive verification, pluggable discovery (mDNS / DNS / gossip). Designed exactly for this use case.

## Decision

Use **Iroh** for all peer-to-peer transport. Hosted in `sidecars/iroh_port/`, accessed from `apps/core/src/mycelium/network/iroh_port.gleam`. The wire protocol on top of Iroh QUIC streams is defined by `proto/wire.cddl` and documented in `docs/protocols/wire.md`.

Discovery runs three mechanisms in parallel: mDNS (LAN), DNS-based (n0's discovery service or a self-hosted equivalent), and ring gossip (peer lists shared between known peers).

## Consequences

- We get NAT traversal, mutual TLS via Ed25519 device keys, and BLAKE3-verified blob transfer "for free" — the work to wire it correctly is significant but the protocol design is not ours to author.
- Risk: Iroh is young (the project is well-funded but hasn't reached the maturity of libp2p). Mitigation: keep the wire-protocol envelopes documented independently of Iroh internals; the underlying transport can be swapped without changing the application-layer protocol.
- The relay (when used) sees ciphertext only — Iroh's relays cooperate with our application-layer encryption; they perform packet forwarding without inspection.
- The discovery layer is **pluggable**, so a paranoid user can run their own DNS zone and disable n0's default. This satisfies SPECIFICATION risk R-12 (a hostile discovery host).

## References

- `../MYCELIUM.md` §5 (Stack), §10 (P2P sync layer).
- `../SPECIFICATION.md` FR-SYNC-04, FR-SYNC-05, FR-SYNC-06 (discovery + relay), R-02 (hole-punching failure mitigation).
- Iroh: https://iroh.computer
