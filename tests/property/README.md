# Property tests

PropCheck-style stateful tests for CRDT convergence (per NFR-MAINT-02).

The test setup spins up N simulated peers in-process, generates random sequences of operations (insert, delete, move, format) per peer, applies them in random orders to each peer's local Loro instance, and asserts that all peers converge to identical state.

This directory is scaffolded for M0; the actual tests land in M1 alongside Loro integration. The property generators and the convergence oracle are sketched below for the M1 author.

## Generators

- `op_seq(peer_count, op_count)` — produces a list of `(peer_id, op)` tuples.
- `network_schedule(op_seq, drop_rate, reorder_rate)` — produces the order in which each peer observes each op.
- `partition_event(probability)` — periodically partitions the network for K rounds.

## Oracle

```
forall (op_seq, schedule):
    after applying op_seq under schedule:
    forall peers p1, p2 in the network:
        loro_state(p1) == loro_state(p2)
```

A failing case is shrunk by removing operations one at a time until a minimal counterexample is found.

## Run target

```
gleam test --apps mycelium    # runs everything including these
gleam test --apps mycelium --filter property::    # only property tests
```

CI runs ≥ 1,000 generated cases per run (per §13.2 of ../../docs/SPECIFICATION.md).
