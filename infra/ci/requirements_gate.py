#!/usr/bin/env python3
"""Requirements traceability gate.

Reconciles tests against `docs/compliance/REQUIREMENTS_MATRIX.md`.

Failure modes (M0 strict only on the second one):
  - A FR-ID listed in the matrix as implemented has no corresponding test
    file referenced (soft warn in M0; strict from M1).
  - A test references a FR-ID that does not appear in the matrix (always fails).

The matrix lists "Verifying test(s)" per row. M0 acceptance is that the
matrix exists and is parseable; per-test FR-ID annotation is M1 work.
"""

from __future__ import annotations

import io
import re
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent.parent
MATRIX = ROOT / "docs" / "compliance" / "REQUIREMENTS_MATRIX.md"
FR_PATTERN = re.compile(r"\bFR-[A-Z]+-\d+\b")
ROW_PATTERN = re.compile(r"\|\s*(FR-[A-Z]+-\d+)\s*\|.*?\|.*?\|\s*(.*?)\s*\|")
TEST_DIRS = [
    ROOT / "apps" / "core" / "test",
    ROOT / "apps" / "cli" / "test",
    ROOT / "apps" / "frontend" / "test",
    ROOT / "tests",
]
SOURCE_DIRS = [
    ROOT / "apps" / "core" / "src",
    ROOT / "apps" / "cli" / "src",
    ROOT / "sidecars",
    ROOT / "apps" / "relay",
    ROOT / "apps" / "desktop" / "src",
]

STRICT = "--strict" in sys.argv


def load_matrix() -> dict[str, str]:
    if not MATRIX.exists():
        print(f"FATAL: matrix file missing: {MATRIX}")
        sys.exit(2)
    out: dict[str, str] = {}
    for line in MATRIX.read_text(encoding="utf-8").splitlines():
        m = ROW_PATTERN.search(line)
        if m:
            fr_id, status = m.group(1), m.group(2)
            out[fr_id] = status
    return out


def collect_referenced(directories: list[Path]) -> dict[str, set[Path]]:
    out: dict[str, set[Path]] = {}
    for root_dir in directories:
        if not root_dir.exists():
            continue
        for path in root_dir.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix not in {".gleam", ".rs", ".erl", ".js", ".sh", ".py", ".md"}:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            for fr_id in FR_PATTERN.findall(text):
                out.setdefault(fr_id, set()).add(path)
    return out


def main() -> int:
    matrix = load_matrix()
    if not matrix:
        print("FATAL: matrix has no FR rows")
        return 2

    referenced = collect_referenced(TEST_DIRS + SOURCE_DIRS)

    hard_failures: list[str] = []
    soft_warnings: list[str] = []

    for fr_id, status in matrix.items():
        if "implemented" in status.lower() or "[OK]" in status or status.strip().startswith("✅"):
            if fr_id not in referenced:
                soft_warnings.append(
                    f"  - {fr_id} marked implemented but no source/test references it"
                )

    matrix_ids = set(matrix.keys())
    for fr_id, where in referenced.items():
        if fr_id not in matrix_ids:
            files = ", ".join(str(p.relative_to(ROOT)) for p in sorted(where))
            hard_failures.append(f"  - {fr_id} referenced in {files} but absent from matrix")

    print(
        f"Requirements gate: {len(matrix)} FR rows in matrix, "
        f"{len(referenced)} unique FR-IDs referenced in source/tests"
    )

    if soft_warnings:
        print(
            f"WARN ({len(soft_warnings)}): rows marked implemented without an FR-ID literal "
            "in source/tests. Soft in M0; will be strict from M1."
        )
        for w in soft_warnings[:10]:
            print(w)
        if len(soft_warnings) > 10:
            print(f"  ... and {len(soft_warnings) - 10} more")

    if hard_failures:
        print(f"FAIL ({len(hard_failures)}): FR-IDs referenced in code that are NOT in the matrix:")
        for f in hard_failures:
            print(f)
        return 1

    if STRICT and soft_warnings:
        print("FAIL: --strict mode and soft warnings present")
        return 1

    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
