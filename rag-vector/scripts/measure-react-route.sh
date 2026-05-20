#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3000}"
TARGET="${2:-http://127.0.0.1:${PORT}/react/sqlite-native}"
LOG_FILE="${3:-/tmp/rag-route-startup.log}"

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID"
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd "$(cd "$(dirname "$0")/.." && pwd)"

rm -f "$LOG_FILE"
PORT="$PORT" bun dev > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "starting server (pid=$SERVER_PID) on port=$PORT"

for attempt in $(seq 1 120); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/react/sqlite-native" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

start_ms="$(date +%s%3N)"
response="$(curl -o /tmp/rag-route.html -s -w 'HTTP:%{http_code} TTFB:%{time_starttransfer} TOTAL:%{time_total} CONNECT:%{time_connect}' "$TARGET")"
end_ms="$(date +%s%3N)"

echo "$response"
echo "wall-ms:$((end_ms - start_ms))"

echo "--- server log tail ---"
tail -n 40 "$LOG_FILE"
