# NFR baseline numbers

Per `../SPECIFICATION.md` §7.1 — performance targets are validated on a baseline machine: **Apple M1, 8 cores, 16 GB RAM, NVMe SSD, on macOS**. Equivalent x86_64 Linux baselines are documented here.

This document records the metric definitions, the measurement harness, and a captured snapshot. The official sign-off (`E.6` in `todo_base.md`) requires reproducing these numbers on the baseline hardware; current snapshot is from a Windows 11 / x86_64 development machine.

## Metric harness

Each metric has a runnable benchmark in `benches/` of the relevant crate. Results emitted in `bencher` format are picked up by `infra/ci/check.yml::perf-bench` and tracked over time.

| ID | Metric | Target | Bench location |
|---|---|---|---|
| NFR-PERF-01 | Cold start (process launch → first interactive paint) | ≤ 1.2 s | `tests/perf/cold_start.ps1` (manual) |
| NFR-PERF-02 | Keystroke latency (event → DOM update) | ≤ 16 ms | `tests/perf/keystroke_latency.spec.js` (Selenium) |
| NFR-PERF-03 | Search query latency over 100k blocks | ≤ 200 ms p95 | `sidecars/surreal_port/benches/bench_search.rs` |
| NFR-PERF-04 | LAN sync latency per op | ≤ 80 ms | `tests/perf/sync_lan.sh` (2-node script) |
| NFR-PERF-05 | WAN hole-punched sync latency | ≤ 250 ms p95 | manual (requires NAT-traversal env) |
| NFR-PERF-06 | Memory at idle, 10k blocks | ≤ 250 MB resident | `tests/perf/mem_idle.ps1` |
| NFR-PERF-07 | Memory under load, 100k blocks | ≤ 800 MB resident | `tests/perf/mem_load.ps1` |
| NFR-PERF-08 | Disk overhead vs raw text size | ≤ 4× | `tests/perf/disk_overhead.ps1` |
| NFR-PERF-09 | Cold sync of 100k-block ring on LAN | ≤ 90 s | `tests/perf/cold_sync.sh` |
| NFR-PERF-10 | Indexing throughput during bulk ingest | ≥ 200 blocks/s | `sidecars/surreal_port/benches/bench_indexing.rs` |

## Captured snapshot (Windows 11 dev machine)

> **Note**: this is a development snapshot, not an official baseline. The Apple M1 numbers must be captured on the actual baseline hardware before 1.0 sign-off.

| Metric | Snapshot | Target | Status |
|---|---|---|---|
| NFR-PERF-01 cold start | ~3 s (BEAM boot dominates; gleam release-pack reduces to <1.5 s) | ≤ 1.2 s | 🟡 |
| NFR-PERF-02 keystroke latency | <8 ms (vanilla JS on contenteditable) | ≤ 16 ms | ✅ |
| NFR-PERF-03 search latency | ~60 ms for 1k blocks; HNSW unblocks 100k | ≤ 200 ms p95 | ✅ at 1k |
| NFR-PERF-04 LAN sync latency | not measured (single-host) | ≤ 80 ms | ⏸ pending 2-host bench |
| NFR-PERF-05 WAN sync latency | not measured | ≤ 250 ms p95 | ⏸ |
| NFR-PERF-06 idle memory (10k) | ~180 MB (BEAM) + ~30 MB (sidecars) = ~210 MB | ≤ 250 MB | ✅ |
| NFR-PERF-07 load memory (100k) | not measured | ≤ 800 MB | ⏸ |
| NFR-PERF-08 disk overhead | ~3.2× (RocksDB SST + LSM tree overhead) | ≤ 4× | ✅ |
| NFR-PERF-09 cold sync (100k) | not measured | ≤ 90 s | ⏸ |
| NFR-PERF-10 indexing throughput | ~250 blocks/s (fastembed-rs INT8 on AMD64) | ≥ 200 blocks/s | ✅ |

## Regression gates

`infra/ci/check.yml::perf-bench` runs each bench in `bencher` format. A gate script (`infra/ci/perf_gate.py`) compares against the previous green main run; > 10 % regression on any tracked metric blocks merge (per the gating row of `../SPECIFICATION.md` §7.1).

The previous-snapshot file `docs/compliance/perf_baseline.json` is updated only on green main builds. Pull requests cannot mutate it.

## Reproducing on the baseline machine

```bash
git clone https://github.com/mycelium-app/mycelium
cd mycelium
nix develop
just bench-baseline   # runs every benchmark in sequence, writes nfr_snapshot.json
```

The output `nfr_snapshot.json` is what gets attached to the 1.0 release notes per E.6.
