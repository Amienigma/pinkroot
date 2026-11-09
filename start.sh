#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [ -f "$DIR/server/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$DIR/server/.env"
  set +a
fi

PORT="${PORT:-8108}"
mkdir -p "$DIR/logs"

if [ -f "$DIR/pinkroot.pid" ]; then
  old="$(cat "$DIR/pinkroot.pid" 2>/dev/null || true)"
  if [ -n "${old:-}" ] && kill -0 "$old" 2>/dev/null; then
    echo "Restarting PINKROOT (pid $old)"
    kill "$old" 2>/dev/null || true
    for _ in 1 2 3 4 5; do
      kill -0 "$old" 2>/dev/null || break
      sleep 1
    done
    kill -9 "$old" 2>/dev/null || true
  fi
  rm -f "$DIR/pinkroot.pid"
fi

nohup node "$DIR/server/server.js" >> "$DIR/logs/pinkroot.log" 2>&1 &
echo $! > "$DIR/pinkroot.pid"
echo "PINKROOT started (pid $(cat "$DIR/pinkroot.pid"))"
echo "Open http://localhost:${PORT}"
echo "Logs: $DIR/logs/pinkroot.log"
echo "Stop:  kill \$(cat $DIR/pinkroot.pid)"
