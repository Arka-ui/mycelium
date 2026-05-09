# Integration tests

Multi-node sync tests (per §13.2 of ../../docs/SPECIFICATION.md). Each test:

1. Spins up two-to-five Mycelium nodes in-process, each with its own BEAM (or its own simulated BEAM via mocks for fast iteration).
2. Connects them via a stub network that supports configurable latency, drops, and partitions.
3. Drives a scripted user scenario (edit, sync, go offline, edit offline, come back).
4. Asserts the post-scenario state matches expectations on every node.

This directory is scaffolded for M0; the tests land in M1 alongside Iroh integration.

## Scenarios planned

- **two_node_lan_sync** — two nodes on the same simulated LAN; A edits, B sees the edit within the sync latency target.
- **offline_edit_then_sync** — A goes offline, edits, comes back; B receives the delta on reconnect.
- **three_node_partition_heal** — three nodes; the network partitions A from B and C; A and B/C diverge; the partition heals; all three converge.
- **late_joiner** — a fourth node is added to a ring with substantial history; it receives a snapshot rather than the full op log.
- **revoked_member** — a node is revoked; it can no longer establish new connections to the ring.

## Run target

```
gleam test --apps mycelium --filter integration::
```

Network conditions (latency, drops, reorder, partition probability) are parameterized per test via `tests/integration/sim_network.gleam`.
