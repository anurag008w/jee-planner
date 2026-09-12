#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# JEE Planner Launcher — pehle purana server KILL karo, phir FRESH start,
# ready hone tak wait karo, phir browser me localhost:1601 kholo.
# Dobara dabane par bhi single instance hi chalega (kill → restart).
# ---------------------------------------------------------------------------
set -u

PORT=1601
URL="http://localhost:${PORT}"
APP_DIR="/home/anurag/Desktop/jee-planner"
LOG="${APP_DIR}/launcher.log"
NODE_BIN="/home/anurag/.config/nvm/versions/node/v22.22.2/bin"

export PATH="${NODE_BIN}:${PATH}"
ulimit -n 65536 2>/dev/null || true

log() { echo "[$(date '+%F %T')] $*" >> "${LOG}"; }

# Port 1601 pe LISTEN karne wale PIDs
port_pids() {
  ss -ltnp 2>/dev/null | grep -oP '(?<=pid=)\d+' | sort -un
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
  # TERM ka wait — max ~5 sec, port free hote hi aage badho
  for _ in $(seq 1 10); do
    [ -z "$(port_pids)" ] && break
    sleep 0.5
  done
  # Jo ziddi bache, unko KILL
  LEFT="$(port_pids)"
  if [ -n "${LEFT}" ]; then
    log "force-killing stuck pids: $(echo ${LEFT} | tr '\n' ' ')"
    # shellcheck disable=SC2086
    kill -9 ${LEFT} 2>/dev/null || true
    sleep 1
  fi
fi

if [ -n "$(port_pids)" ]; then
  log "ERROR: port ${PORT} still busy — aborting"
  notify-send "JEE Planner" "Port ${PORT} busy hai — server start nahi hua. launcher.log dekho." 2>/dev/null || true
  exit 1
fi

# --- 2) Fresh server start ---
cd "${APP_DIR}" || exit 1
: > "${LOG}"
nohup node server.mjs >> "${LOG}" 2>&1 &
NEW_PID=$!
log "started new server pid=${NEW_PID}"

# --- 3) Ready hone tak poll karo (max ~10 sec), apna pid alive bhi check karo ---
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
  log "server ready — opening browser"
  xdg-open "${URL}" >/dev/null 2>&1 &
  exit 0
else
  log "ERROR: server did not become ready — not opening browser"
  notify-send "JEE Planner" "Server ready nahi hua. launcher.log dekho." 2>/dev/null || true
  exit 1
fi
