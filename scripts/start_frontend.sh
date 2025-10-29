#!/usr/bin/env bash
set -euo pipefail

# Start the Streamlit frontend in the foreground
# Usage: ./scripts/start_frontend.sh [PORT]

# Resolve repo root (one level up from this script dir)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR/frontend"

PORT="${1:-${FRONTEND_PORT:-}}"

echo "Starting frontend (Streamlit) ${PORT:+on port ${PORT}}..."
if [[ -n "${PORT}" ]]; then
  exec streamlit run main.py --server.port "${PORT}"
else
  exec streamlit run main.py
fi
