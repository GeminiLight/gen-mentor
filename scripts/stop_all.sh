#!/usr/bin/env bash
set -euo pipefail

# Stop backend and frontend processes started by start_all.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
PID_DIR="$ROOT_DIR/pids"

stop_by_pidfile() {
  local name="$1" pidfile="$PID_DIR/$1.pid"
  if [[ ! -f "$pidfile" ]]; then
    echo "No PID file for $name ($pidfile). Skipping."
    return 0
  fi
  local pid
  pid="$(cat "$pidfile" || true)"
  if [[ -z "$pid" ]]; then
    echo "PID file $pidfile empty. Removing and skipping."
    rm -f "$pidfile"
    return 0
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "$name (pid $pid) is not running. Removing PID file."
    rm -f "$pidfile"
    return 0
  fi
  echo "Stopping $name (pid $pid)..."
  kill "$pid" || true
  # Wait up to 10s for graceful shutdown, then force kill
  for i in {1..10}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    sleep 1
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo "$name did not exit gracefully. Sending SIGKILL."
    kill -9 "$pid" || true
  fi
  rm -f "$pidfile"
  echo "$name stopped."
}

stop_by_pidfile backend
stop_by_pidfile frontend

echo "All services stopped."
