# Audit ignores rationale

`.cargo/audit.toml` ignores 23 RUSTSEC advisories (down from 37 after the wasmtime 26 → 36 upgrade in PR #7). Every entry is in a transitive dependency we do not call directly. The vulnerable code paths are not invoked by the desktop binary or the headless relay today.

## Categories

### Vulnerabilities (2)

| ID | Crate | Source path | Resolution plan |
|---|---|---|---|
| RUSTSEC-2026-0118 | `hickory-proto` | `iroh-relay → hickory-proto` (M0 stub) | Resolved when `iroh` 0.93+ pulls a patched `hickory`. Tracked in [#1](../../issues/1). |
| RUSTSEC-2026-0119 | `hickory-proto` | same | same |

`iroh_port` is an M0 stub that returns `NotImplemented` for every call; the DNS code path is not reached.

### Unsound (2)

| ID | Crate | Source path | Notes |
|---|---|---|---|
| RUSTSEC-2024-0429 | `glib 0.18` | Tauri Linux backend (`gtk` 0.18 chain) | Will clear when Tauri ships a `gtk4` backend (planned upstream). |
| RUSTSEC-2026-0002 | `lru 0.13` | `iroh → pkarr → lru` | Resolved by `iroh` upgrade. Tracked in [#1](../../issues/1). |

### Unmaintained — Tauri Linux GTK 3 chain (10)

These are the GTK 3 stack that Tauri uses on Linux. They are flagged unmaintained because GTK 4 is the upstream successor; Tauri's GTK 4 backend is on its roadmap. Until then there is no actionable fix and no exploitable surface that Mycelium reaches directly.

| ID | Crate |
|---|---|
| RUSTSEC-2024-0411 | `gdkwayland-sys` |
| RUSTSEC-2024-0412 | `gdk` |
| RUSTSEC-2024-0413 | `atk` |
| RUSTSEC-2024-0415 | `gtk` |
| RUSTSEC-2024-0416 | `atk-sys` |
| RUSTSEC-2024-0418 | `gdk-sys` |
| RUSTSEC-2024-0419 | `gtk3-macros` |
| RUSTSEC-2024-0420 | `gtk-sys` |
| RUSTSEC-2024-0436 | `paste` |
| RUSTSEC-2024-0429 | `glib` (also unsound, listed above) |

### Unmaintained — small ecosystem warnings (9)

Transitive crates flagged unmaintained, no security impact, no actionable fix without ecosystem-wide migration:

| ID | Crate | Used by |
|---|---|---|
| RUSTSEC-2023-0089 | `atomic-polyfill` | older mio chain |
| RUSTSEC-2024-0370 | `proc-macro-error` | macro infrastructure (transitive) |
| RUSTSEC-2024-0384 | `instant` | superseded by `web-time`; tauri/serde transitives |
| RUSTSEC-2025-0075 | `unic-char-range` | unicode tables (transitive) |
| RUSTSEC-2025-0080 | `unic-common` | same |
| RUSTSEC-2025-0081 | `unic-char-property` | same |
| RUSTSEC-2025-0098 | `unic-ucd-version` | same |
| RUSTSEC-2025-0100 | `unic-ucd-ident` | same |
| RUSTSEC-2025-0119 | `number_prefix` | logging crate transitive |
| RUSTSEC-2025-0141 | `bincode` | serialisation transitive |

## Cleared in this revision

The wasmtime upgrade (PR #7) plus the wasmtime-wasi follow-up cleared **14 advisories** from the previous list:

- Wasmtime cluster: RUSTSEC-2026-0020, 0021, 0085, 0086, 0087, 0088, 0089, 0091, 0092, 0093, 0094, 0095, 0096, RUSTSEC-2025-0046, 0118 (15 IDs).

That makes [#2](../../issues/2) (M2 wasmtime advisory cleanup) **fully resolved**.

## Discharge plan

- **#1 (M1 deps)**: when `iroh` is bumped to a release that pulls patched `hickory-proto` and `lru`, delete the corresponding lines from `audit.toml`.
- **GTK 3 chain**: track Tauri upstream for the GTK 4 backend; remove en masse when it lands.
- **Small ecosystem warnings**: re-evaluate annually; many of these have community successor crates that the wider Rust ecosystem will adopt over time.

## Why ignore rather than continue-on-error

Tracking individual advisory IDs forces an explicit decision per CVE. `continue-on-error: true` on the whole job would silently swallow real future vulnerabilities in code paths we *do* exercise (the desktop binary, surreal_port, crypto_port). The ignore list keeps the signal sharp.

## Reviewer checklist when adding to this list

Before adding a new advisory ID, confirm:

1. The vulnerable code path is not reached by any released M0/M1/etc. binary at the current milestone.
2. The advisory has a documented resolution plan (upstream bump, fork patch, dep removal).
3. A tracking issue exists in this repo with the milestone label.
4. This file is updated in the same PR.
