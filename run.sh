#!/usr/bin/env bash
#
# Akshara developer entrypoint.
#
#   ./run.sh              # backend + web together (same as `dev`)
#   ./run.sh dev          # ditto
#   ./run.sh backend      # FastAPI on :8000
#   ./run.sh frontend     # Vite on :5173
#   ./run.sh install      # uv sync + npm install
#   ./run.sh test         # pytest + vitest
#   ./run.sh lint         # ruff + eslint
#   ./run.sh typecheck    # tsc --noEmit
#   ./run.sh build        # production web build
#   ./run.sh check        # everything CI runs, locally
#
# Environment: API_PORT (default 8000), WEB_PORT (default 5173),
#              AKSHARA_PROVIDER (fixture by default; "prisma" for live STT).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB="$ROOT/web"

API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-5173}"

# A global NODE_ENV=production makes npm skip devDependencies and makes React's
# act() throw in tests, so the install/dev/test paths force development.
# (`vite build` sets production for the bundle itself.)
force_dev_env() { export NODE_ENV=development; }

# Load secrets for the backend if present (GNANI_API_KEY, EVON_*).
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi

# 256-colour codes: red for the backend, teal for the frontend.
C_BACKEND=$'\033[38;5;203m'
C_FRONTEND=$'\033[38;5;37m'
C_NOTE=$'\033[1;36m'
C_OFF=$'\033[0m'

log() { printf '%s==> %s%s\n' "$C_NOTE" "$*" "$C_OFF"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required but not installed"; }

# Prefix every line of stdin with a coloured [name] tag, preserving the colour
# the child process already emitted. Keeps two interleaved logs readable.
label() {
  local colour="$1" name="$2" line
  while IFS= read -r line; do
    printf '%s[%s]%s %s\n' "$colour" "$name" "$C_OFF" "$line"
  done
}

# Kill a process and its children (npm spawns vite; a plain kill leaves it).
kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

usage() {
  cat <<'EOF'
Akshara dev runner

  ./run.sh              backend + web together, offline (no credits)
  ./run.sh dev          ditto
  ./run.sh live         real Prisma + Timbre + live web (costs credits)
  ./run.sh backend      FastAPI only (http://127.0.0.1:8000)
  ./run.sh frontend     Vite only (http://localhost:5173)
  ./run.sh install      install Python and web dependencies
  ./run.sh test         pytest + vitest
  ./run.sh lint         ruff check, ruff format --check, eslint
  ./run.sh typecheck    tsc --noEmit
  ./run.sh build        production web build
  ./run.sh check        the full CI suite, locally
  ./run.sh help         this text

Environment:
  API_PORT=8000         backend port
  WEB_PORT=5173         web dev-server port
  AKSHARA_PROVIDER      fixture (default) or prisma
  VITE_API_MODE         mock (default) or live

Modes:
  dev / no argument     fixture provider + mock web: no network, no credits
  live / demo           prisma provider + live web: real transcription and audio,
                        ~0.05-0.1 credits per attempt, capped by AKSHARA_MAX_CALLS

Logs are tagged: [backend] in red, [frontend] in teal.
The web app talks to the API through the Vite dev proxy, so /v1 needs no CORS.
EOF
}

install_all() {
  need uv
  need npm
  force_dev_env
  log "Python dependencies (uv sync)"
  ( cd "$ROOT" && uv sync )
  log "Web dependencies (npm install)"
  ( cd "$WEB" && npm install --include=dev --no-fund --no-audit )
}

backend() {
  need uv
  log "Backend on http://127.0.0.1:${API_PORT} (provider: ${AKSHARA_PROVIDER:-fixture})"
  ( cd "$ROOT" && exec uv run uvicorn akshara.api.app:create_app \
      --factory --host 127.0.0.1 --port "$API_PORT" --reload ) 2>&1 \
    | label "$C_BACKEND" backend
}

frontend() {
  need npm
  force_dev_env
  log "Web on http://localhost:${WEB_PORT}"
  ( cd "$WEB" && exec npm run dev -- --port "$WEB_PORT" ) 2>&1 \
    | label "$C_FRONTEND" frontend
}

# Shared by `dev` (fixture + mock) and `live` (Prisma + live web).
run_both() {
  local provider="$1" web_mode="$2"

  need uv
  need npm
  force_dev_env

  local tmp api_log web_log api web api_tail web_tail
  tmp="$(mktemp -d)"
  api_log="$tmp/api.log"
  web_log="$tmp/web.log"
  : > "$api_log"
  : > "$web_log"

  ( cd "$ROOT" && exec env AKSHARA_PROVIDER="$provider" uv run uvicorn akshara.api.app:create_app \
      --factory --host 127.0.0.1 --port "$API_PORT" --reload ) >"$api_log" 2>&1 &
  api=$!

  ( cd "$WEB" && exec env VITE_API_MODE="$web_mode" npm run dev -- --port "$WEB_PORT" ) >"$web_log" 2>&1 &
  web=$!

  # Tail each log through the labeller so the two streams stay distinguishable.
  label "$C_BACKEND" backend < <(tail -n +1 -F "$api_log") &
  api_tail=$!
  label "$C_FRONTEND" frontend < <(tail -n +1 -F "$web_log") &
  web_tail=$!

  cleanup() {
    trap - INT TERM EXIT
    kill "$api_tail" "$web_tail" 2>/dev/null || true
    kill_tree "$web"
    kill_tree "$api"
    rm -rf "$tmp"
  }
  trap cleanup INT TERM EXIT

  log "Backend http://127.0.0.1:${API_PORT} (${provider})   Web http://localhost:${WEB_PORT} (${web_mode})"
  log "Ctrl-C stops both."
  wait "$web"
}

# Offline: fixture transcripts + in-browser fixtures. No network, no credits.
dev() { run_both fixture mock; }

# Real pipeline: Prisma transcription and Timbre audio. Costs credits per attempt.
live() {
  [ -n "${GNANI_API_KEY:-}" ] || die "GNANI_API_KEY is not set (put it in .env); live mode needs it"
  log "LIVE MODE — real Prisma transcription and Timbre audio."
  log "Costs credits per attempt. Ledger: results/ledger.jsonl (cap ${AKSHARA_MAX_CALLS:-600})."
  run_both prisma live
}

test_all() {
  log "Python tests"
  ( cd "$ROOT" && uv run pytest -q )
  log "Web tests"
  ( force_dev_env; cd "$WEB" && npm test )
}

lint_all() {
  log "Python lint"
  ( cd "$ROOT" && uv run ruff check . && uv run ruff format --check . )
  log "Web lint"
  ( force_dev_env; cd "$WEB" && npm run lint )
}

typecheck_all() {
  log "Web typecheck"
  ( force_dev_env; cd "$WEB" && npm run typecheck )
}

build_all() {
  log "Web build"
  # A production build regardless of a NODE_ENV=development shell, otherwise the
  # bundle carries React's development code and blows the budget.
  ( export NODE_ENV=production; cd "$WEB" && npm run build )
  log "Bundle budget"
  ( export NODE_ENV=production; cd "$WEB" && npm run budget )
}

check_all() {
  lint_all
  typecheck_all
  test_all
  log "Offline study checks"
  ( cd "$ROOT" && uv run python scripts/go_no_go.py --dry-run >/dev/null )
  ( cd "$ROOT" && uv run python scripts/check_numbers.py )
  build_all
  log "All checks passed."
}

case "${1:-dev}" in
  install) install_all ;;
  backend) backend ;;
  frontend) frontend ;;
  dev | start) dev ;;
  live | demo) live ;;
  test) test_all ;;
  lint) lint_all ;;
  typecheck) typecheck_all ;;
  build) build_all ;;
  check | ci) check_all ;;
  help | -h | --help) usage ;;
  *)
    usage
    exit 2
    ;;
esac
