# Load tests

Soak tests verifying the system survives sustained churn over long windows (per §13.2 of ../../docs/SPECIFICATION.md).

Each soak test:

1. Boots N nodes (default N=5).
2. Generates randomized churn — nodes write at varying rates, others go offline and back online, peers join and leave the ring — for 24 hours of simulated time.
3. Periodically asserts: no panics, no unhandled errors, no message backpressure exhaustion, no memory growth above the configured ceiling, no data loss.

This directory is scaffolded for M0; the soak tests land in M3 alongside the production-polish work.

## Run target

```
gleam test --apps mycelium --filter load::
```

CI runs the soak suite weekly (per §13.2 — "the 24-hour soak test runs at minimum weekly in CI, with results archived").

The 1.0 acceptance criterion (§11) requires the soak test to run to completion with zero data loss and zero unhandled crashes.
