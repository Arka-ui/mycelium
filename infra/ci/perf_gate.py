#!/usr/bin/env python3
"""Performance regression gate.

Reads the bencher-format output of `cargo bench` (lines like
`test bench_x ... bench:    1234 ns/iter (+/- 0)`) and compares against
`docs/compliance/perf_baseline.json`. Fails if any metric regressed by more
than 10% (per ../../docs/SPECIFICATION.md §7.1 gating row).
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
BASELINE = ROOT / "docs" / "compliance" / "perf_baseline.json"
THRESHOLD_PCT = 10
PATTERN = re.compile(r"^test\s+(\S+)\s+\.\.\.\s+bench:\s+([\d,]+)\s+ns/iter")


def parse_bench(text: str) -> dict[str, int]:
    out: dict[str, int] = {}
    for line in text.splitlines():
        m = PATTERN.match(line)
        if m:
            out[m.group(1)] = int(m.group(2).replace(",", ""))
    return out


def load_baseline() -> dict[str, int]:
    if not BASELINE.exists():
        return {}
    try:
        data = json.loads(BASELINE.read_text(encoding="utf-8"))
        return {k: int(v) for k, v in data.items()}
    except Exception:
        return {}


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: perf_gate.py <bencher_output_file>")
        return 2

    measurements = parse_bench(Path(argv[1]).read_text(encoding="utf-8"))
    baseline = load_baseline()

    if not measurements:
        print("FATAL: no bench measurements parsed")
        return 2

    print(f"Perf gate: {len(measurements)} metrics, {len(baseline)} baseline rows")

    failures = []
    for name, ns in measurements.items():
        prev = baseline.get(name)
        if prev is None:
            print(f"  ➕ {name}: {ns} ns/iter (no baseline)")
            continue
        delta_pct = ((ns - prev) / prev) * 100 if prev > 0 else 0.0
        sign = "+" if delta_pct >= 0 else ""
        marker = ""
        if delta_pct > THRESHOLD_PCT:
            marker = " REGRESSION"
            failures.append(f"  ❌ {name}: {prev} → {ns} ({sign}{delta_pct:.1f}%)")
        elif delta_pct < -THRESHOLD_PCT:
            marker = " (improved)"
        print(f"  {name}: {prev} → {ns} ({sign}{delta_pct:.1f}%){marker}")

    if failures:
        print()
        print("FAIL: > 10 % regression")
        for f in failures:
            print(f)
        return 1

    if not baseline:
        print()
        print(f"No baseline file at {BASELINE}; updating it now (first-run mode)")
        BASELINE.parent.mkdir(parents=True, exist_ok=True)
        BASELINE.write_text(json.dumps(measurements, indent=2, sort_keys=True), encoding="utf-8")

    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
