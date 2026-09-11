#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# JEE Planner Launcher — server start karo, ready hone tak wait karo,
# phir default browser me localhost:1601 kholo.
# ---------------------------------------------------------------------------
set -u

PORT=1601
URL="http://localhost:${PORT}"
APP_DIR="/home/anurag/Desktop/jee-planner"
LOG="${APP_DIR}/launcher.log"
NODE_BIN="/home/anurag/.config/nvm/versions/node/v22.22.2/bin"

export PATH="${NODE_BIN}:${PATH}"
ulimit -n 65536 2>/dev/null || true

# Agar purana server is port pe chal raha hai toh usse chhodo (naya start hoga)
PID="$(pgrep -f "node server.mjs" | head -1 || true)"
[ -n "${PID}" ] && kill "${PID}" 2>/dev/null

# Server start (background, persistent)
cd "${APP_DIR}" || exit 1
nohup node server.mjs > "${LOG}" 2>&1 &

# Ready hone tak poll karo (max ~10 sec)
for i in $(seq 1 20); do
  if curl -sf -o /dev/null "${URL}" 2>/dev/null; then
    break
  fi
  sleep 0.5
done

# Browser kholo
xdg-open "${URL}" >/dev/null 2>&1 &
exit 0