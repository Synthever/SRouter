#!/bin/bash
# Throughput sweep against an isolated SRouter instance.
#
# Starts a throwaway `loadtest_server` (temp DB + local fake upstream — never
# touches the live :3000 gateway or a real provider), ramps k6 through a series
# of arrival rates, and writes a markdown results table to the repo.
#
# Usage:
#   server/src/benchmark/run_throughput.sh [output.md]
#
# Env overrides:
#   RATES="200 500 1000 1667"   arrival rates (req/s) to test
#   DURATION=30s                hold time per rate
#   RAMP_UP=10s                 ramp time per rate
#   KEEPALIVE=true|false        reuse TCP connections (default true)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BENCH_DIR="$REPO_ROOT/server/src/benchmark"
BINARY="$REPO_ROOT/server/target/debug/loadtest_server"
SCRIPT="load_100k.js"

OUT="${1:-$BENCH_DIR/RESULTS.md}"
RATES="${RATES:-200 500 1000 1667}"
DURATION="${DURATION:-30s}"
RAMP_UP="${RAMP_UP:-10s}"
KEEPALIVE="${KEEPALIVE:-true}"

PORT="${BENCH_PORT:-4100}"
API_KEY="sr-live-loadtest-00000000-0000-0000-0000-000000000000"

log() { echo "[throughput] $*" >&2; }

if ! command -v k6 >/dev/null 2>&1; then
    log "k6 not found on PATH"; exit 1
fi
if [ ! -x "$BINARY" ]; then
    log "loadtest_server not built: cargo build --manifest-path server/Cargo.toml --bin loadtest_server"
    exit 1
fi

SERVER_PID=""
cleanup() {
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

log "starting isolated instance on :$PORT"
"$BINARY" --port "$PORT" >/tmp/throughput-server.json 2>/tmp/throughput-server.log &
SERVER_PID=$!

# wait for readiness
for _ in $(seq 1 50); do
    if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then break; fi
    sleep 0.2
done
if ! curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    log "server failed to start; see /tmp/throughput-server.log"; exit 1
fi
log "instance ready (pid $SERVER_PID)"

# machine context for the report
NPROC="$(nproc)"
MEM="$(free -m | awk '/^Mem:/{print $2}')MB"
K6VER="$(k6 version 2>/dev/null | head -1)"
DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
KEEPALIVE_NOTE="no (new TCP connection per request)"
[ "$KEEPALIVE" = "true" ] && KEEPALIVE_NOTE="yes (connections reused)"

{
    echo "# SRouter Throughput Benchmark"
    echo
    echo "- Date: $DATE"
    echo "- Host: $(nproc) cores / ${MEM} RAM"
    echo "- k6: $K6VER"
    echo "- Workload: mixed (50% streaming chat, 40% buffered chat, 10% /v1/models)"
    echo "- Upstream: local fake (isolated instance, temp DB, no real provider)"
    echo "- Connection reuse: $KEEPALIVE_NOTE"
    echo
    echo "| Target (req/s) | Delivered (req/s) | Failed | p(50) | p(90) | p(95) |"
    echo "|---:|---:|---:|---:|---:|---:|"
} > "$OUT"

for rate in $RATES; do
    # Restart the instance before each rate so measurements are independent
    # (a degraded server from the previous rate inflates the next one's failures).
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    "$BINARY" --port "$PORT" >/tmp/throughput-server.json 2>/tmp/throughput-server.log &
    SERVER_PID=$!
    for _ in $(seq 1 50); do
        curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1 && break
        sleep 0.2
    done

    log "testing ${rate} req/s (${DURATION} hold)"
    tmp="$(mktemp)"
    BASE_URL="http://127.0.0.1:$PORT" API_KEY="$API_KEY" \
    TARGET_RPS="$rate" DURATION="$DURATION" RAMP_UP="$RAMP_UP" \
    KEEPALIVE="$KEEPALIVE" \
        k6 run --no-color --quiet "$BENCH_DIR/$SCRIPT" 2>/dev/null > "$tmp" || true

    delivered="$(grep -E 'http_reqs\.' "$tmp" | grep -oE '[0-9.]+/s$' | tail -1 | sed 's|/s$||')"
    failed="$(grep -E 'http_req_failed\.' "$tmp" | grep -oE '[0-9.]+%' | head -1)"
    p50="$(grep -E 'http_req_duration\.' "$tmp" | grep -oE 'med=[0-9.]+[mµ]?s' | head -1 | cut -d= -f2)"
    p90="$(grep -E 'http_req_duration\.' "$tmp" | grep -oE 'p\(90\)=[0-9.]+[mµ]?s' | head -1 | cut -d= -f2)"
    p95="$(grep -E 'http_req_duration\.' "$tmp" | grep -oE 'p\(95\)=[0-9.]+[mµ]?s' | head -1 | cut -d= -f2)"

    echo "| $rate | ${delivered:-n/a} | ${failed:-n/a} | ${p50:-n/a} | ${p90:-n/a} | ${p95:-n/a} |" >> "$OUT"
    rm -f "$tmp"
done

{
    echo
    echo "> Failure = connection-level reset (k6 status 0), not an HTTP error, when the"
    echo "> accept loop or the 5-connection SQLite write pool is saturated. See"
    echo "> issue #157 for the tuning plan (auth cache, pool sizing, upstream semaphore,"
    echo "> decoupled log writer)."
} >> "$OUT"

log "results written to $OUT"
cleanup
trap - EXIT
