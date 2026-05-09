#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
gleam build >/dev/null 2>&1 || true
exec gleam run -m mycelium
