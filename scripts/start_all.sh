#!/usr/bin/env bash
set -euo pipefail

# Start both backend (uvicorn) and frontend (Streamlit) in the background
# Creates pids/ and logs/ directories and writes PID files for later termination

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

# --- Backend ---
(
  cd "$ROOT_DIR/backend"
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
  BACKEND_PORT="${BACKEND_PORT:-5000}"
  echo "[start_all] Starting backend on port ${BACKEND_PORT}..."
  nohup uvicorn main:app --port "${BACKEND_PORT}" --reload \
    >"$LOG_DIR/backend.log" 2>&1 &
  echo $! >"$PID_DIR/backend.pid"
)

# --- Frontend ---
(
  cd "$ROOT_DIR/frontend"
  # If FRONTEND_PORT is set (env), use it, otherwise let Streamlit default (8501)
  EXTRA_ARGS=()
  if [[ -n "${FRONTEND_PORT:-}" ]]; then
    EXTRA_ARGS+=(--server.port "${FRONTEND_PORT}")
  fi
  echo "[start_all] Starting frontend (Streamlit) ${FRONTEND_PORT:+on port ${FRONTEND_PORT}}..."
  nohup streamlit run main.py "${EXTRA_ARGS[@]}" \
    >"$LOG_DIR/frontend.log" 2>&1 &
  echo $! >"$PID_DIR/frontend.pid"
)

echo "Processes started. PIDs:"
echo "  Backend PID:  $(cat "$PID_DIR/backend.pid")"
echo "  Frontend PID: $(cat "$PID_DIR/frontend.pid")"
echo "Logs: $LOG_DIR/backend.log, $LOG_DIR/frontend.log"
