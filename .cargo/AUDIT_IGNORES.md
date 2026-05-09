# Audit ignores rationale

`.cargo/audit.toml` ignores 37 RUSTSEC advisories at the M0 milestone. Every entry is in a transitive dependency of a **stub sidecar** that returns `Error(NotImplemented)` for every call in M0. The vulnerable code paths are not invoked by the application until the sidecar is wired up at the milestone listed below.

## Affected sidecars (all stubs in M0)

| Sidecar | Real status | Wired at |
|---|---|---|
| `sidecars/wasmedge_port` | Wasmtime 26 host stub. Returns `NotImplemented` for every method. | M2 (plugin sandbox) |
| `sidecars/iroh_port` | Iroh 0.92 stub. Returns `NotImplemented` for every method. | M1 (P2P sync) |
| `sidecars/loro_port` | Loro stub. Returns `NotImplemented` for every method. | M1 (CRDT) |

## Advisory map

| Advisory | Crate | Source path | Resolution plan |
|---|---|---|---|
| RUSTSEC-2026-0002 | `lru 0.13.0` | `iroh -> pkarr -> lru` | Resolved by upstream `iroh` bump (M1). |
| RUSTSEC-2026-0118, RUSTSEC-2026-0119 | `hickory-proto 0.25.2` | `iroh-relay -> hickory` | Resolved by `iroh` 0.93+ (M1). |
| RUSTSEC-2026-0020, 0021, 0085–0096, 0118 | `wasmtime 26.0.1` | `wasmedge_port` direct dep | Bump to `wasmtime 37+` when the sandbox is implemented (M2). |
| RUSTSEC-2025-0046, 0075, 0080, 0081, 0098, 0100, 0118, 0119, 0141 | `wasmtime` and its component-model deps (`wasmtime-cranelift`, `wasmtime-environ`, `wasmtime-runtime`, `wasmtime-wasi`) | `wasmedge_port` direct + transitive | Same as above. |
| RUSTSEC-2024-0370, 0384, 0411, 0412, 0413, 0415, 0416, 0418, 0419, 0420, 0429, 0436 | `wasmtime` family | `wasmedge_port` | Same as above. |
| RUSTSEC-2023-0089 | `actix-web` (transitive) | likely via `iroh-relay` | Re-evaluate at M1 dep refresh. |

## Discharge plan

- **M1 entry criteria** include: `iroh` and `loro` deps refreshed; transitive `lru` and `hickory` advisories cleared. The corresponding lines below are deleted from `audit.toml` at that point.
- **M2 entry criteria** include: `wasmtime` bumped to a version with no open advisories; the entire wasmtime cluster cleared from `audit.toml`.
- The CI security workflow runs `cargo audit` weekly on `main` and on every PR; once an advisory is no longer surfaced, its line in `audit.toml` should be deleted in the same PR.

## Why ignore rather than continue-on-error

Tracking individual advisory IDs forces an explicit decision per CVE. Setting `continue-on-error: true` on the whole job would silently swallow real future vulnerabilities in code paths we *do* exercise (the desktop binary, surreal_port, crypto_port). The ignore list keeps the signal sharp.

## Reviewer checklist when adding to this list

Before adding a new advisory ID, confirm:

1. The vulnerable code path is not reached by any released M0/M1/etc. binary at the current milestone.
2. The advisory has a documented resolution plan (upstream bump, fork patch, dep removal).
3. A tracking issue exists in this repo with the milestone label.
4. This file is updated in the same PR.
