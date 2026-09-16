#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# JEE Planner Launcher — "har baar RUN = hamesha LATEST"
#
#  1. purana server KILL
#  2. git pull (best-effort)
#  3. source naya ho toh AUTO REBUILD — TERMINAL me progress dikhta hai
#  4. fresh server start (background, terminal band ho jata hai)
#  5. cache-bust URL se browser kholo
#
# Success → terminal apne aap band.
# Error   → message 5 sec dikhta hai, phir band.
# ---------------------------------------------------------------------------
set -u

PORT=1601
URL="http://localhost:${PORT}"
APP_DIR="/home/anurag/Desktop/jee-planner"
LOG="${APP_DIR}/launcher.log"
NODE_BIN="/home/anurag/.config/nvm/versions/node/v22.22.2/bin"

export PATH="${NODE_BIN}:${PATH}"
ulimit -n 65536 2>/dev/null || true

say()   { echo "$*"; }
log()   { echo "[$(date '+%F %T')] $*" >> "${LOG}"; }

# Port 1601 pe LISTEN karne wale PIDs
port_pids() {
  ss -ltnp 2>/dev/null | grep -oP '(?<=pid=)\d+' | sort -un
}

# dist rebuild chahiye ya nahi? Har build-input track karta hai —
# src/, public/, index.html, package.json, vite config sab.
# Node_modules/dist/android/APKs/logs ignore (build inputs nahi hain).
needs_build() {
  [ ! -f "${APP_DIR}/dist/index.html" ] && return 0
  find "${APP_DIR}" \
    \( -path "${APP_DIR}/node_modules" -o -path "${APP_DIR}/dist" \
       -o -path "${APP_DIR}/android" -o -path "${APP_DIR}/.git" \
       -o -path "${APP_DIR}/.github" -o -name "*.apk" \
       -o -name "*.log" -o -name "*.keystore" \) -prune -o \
    -type f -newer "${APP_DIR}/dist/index.html" -print -quit 2>/dev/null | grep -q .
}

# --- 1) Purane instance(s) dhoondo: port holders + server.mjs processes ---
VICTIMS="$({
  port_pids
  pgrep -f 'server\.mjs' 2>/dev/null || true
} | grep -E '^[0-9]+$' | sort -un | grep -v -e "^$$\$" -e "^$PPID\$" || true)"

if [ -n "${VICTIMS}" ]; then
  # shellcheck disable=SC2086
  log "killing old server pids: $(echo ${VICTIMS} | tr '\n' ' ')"
  # shellcheck disable=SC2086
  kill ${VICTIMS} 2>/dev/null || true
  for _ in $(seq 1 10); do
    [ -z "$(port_pids)" ] && break
    sleep 0.5
  done
  LEFT="$(port_pids)"
  if [ -n "${LEFT}" ]; then
    log "force-killing stuck pids: $(echo ${LEFT} | tr '\n' ' ')"
    # shellcheck disable=SC2086
    kill -9 ${LEFT} 2>/dev/null || true
    sleep 1
  fi
fi
if [ -n "$(port_pids)" ]; then
  say "❌ Port ${PORT} busy hai — server start nahi hua."
  log "ERROR: port ${PORT} still busy — aborting"
  sleep 5
  exit 1
fi

cd "${APP_DIR}" || { sleep 5; exit 1; }

# --- 2) Latest code lao (best-effort) ---
say ""
say "▶ JEE Planner — latest code chahiye mil raha..."
PULL_OUT="$(git pull --ff-only -q 2>&1 || true)"
if [ -n "${PULL_OUT}" ]; then
  log "git pull: ${PULL_OUT}"
fi

# --- 3) Auto-rebuild — TERMINAL me progress ---
if needs_build; then
  say "⚙  Naya code mila — build ho raha hai (1 baar, ~15-20 sec)..."
  log "source naya hai — rebuilding dist..."
  if ! npm run build 2>&1 | tee -a "${LOG}"; then
    say ""
    say "❌ Build FAIL ho gaya. launcher.log dekho."
    log "ERROR: build failed"
    sleep 5
    exit 1
  fi
  say "✅ Build ho gaya!"
else
  say "✅ Sab current hai — build ki zaroorat nahi."
fi

# --- 4) Fresh server start (background — terminal band ho jayega) ---
: > "${LOG}"
nohup node server.mjs >> "${LOG}" 2>&1 &
NEW_PID=$!
log "started new server pid=${NEW_PID}"

# --- 5) Ready hone tak poll (max ~10 sec) ---
READY=0
for _ in $(seq 1 20); do
  if ! kill -0 "${NEW_PID}" 2>/dev/null; then
    log "ERROR: server pid ${NEW_PID} died on startup"
    break
  fi
  if curl -sf -o /dev/null "${URL}" 2>/dev/null; then
    READY=1
    break
  fi
  sleep 0.5
done

if [ "${READY}" -eq 1 ]; then
  BUST="?v=$(date +%Y%m%d%H%M%S)"
  OPEN_URL="${URL}/${BUST}"
  log "server ready — opening ${OPEN_URL}"
  say ""
  say "✅ JEE Planner khol raha hoon → ${OPEN_URL}"
  say "   (Window band ho sakti hai — app browser me khula hai)"
  xdg-open "${OPEN_URL}" >/dev/null 2>&1 &
  sleep 2
  exit 0
else
  say ""
  say "❌ Server ready nahi hua. launcher.log dekho."
  log "ERROR: server did not become ready"
  sleep 5
  exit 1
fi