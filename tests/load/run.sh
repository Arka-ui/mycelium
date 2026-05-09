#!/usr/bin/env bash
set -euo pipefail

DURATION_HOURS="${SOAK_DURATION_HOURS:-24}"
NODES="${SOAK_NODES:-5}"
LOG_DIR="$(pwd)/logs"
mkdir -p "$LOG_DIR"

DURATION_SECS=$(( DURATION_HOURS * 3600 ))
END_TS=$(( $(date +%s) + DURATION_SECS ))

echo "Soak test: $NODES nodes, $DURATION_HOURS h"

PIDS=()
for i in $(seq 1 "$NODES"); do
    DATA_DIR="$(mktemp -d)"
    PORT=$(( 6000 + i ))
    ../../target/release/mycelium-relay --data-dir "$DATA_DIR" --port "$PORT" \
        > "$LOG_DIR/relay-$i.log" 2>&1 &
    PIDS+=($!)
    echo "started node $i (pid $!) on port $PORT data $DATA_DIR"
done

trap 'for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done' EXIT

while [ "$(date +%s)" -lt "$END_TS" ]; do
    for p in "${PIDS[@]}"; do
        if ! kill -0 "$p" 2>/dev/null; then
            echo "Node $p died at $(date)"
            exit 1
        fi
    done
    sleep 60
done

echo "Soak completed cleanly"
