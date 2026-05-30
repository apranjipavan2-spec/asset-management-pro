#!/data/data/com.termux/files/usr/bin/bash
# Watchdog: keeps server + Cloudflare tunnel alive, and auto-pulls from GitHub.
# Pulls only restart the server if (a) there are new commits and (b) the rebuild succeeds.
# A failed build keeps the previous working version running.
#
# Usage:        ./scripts/phone_watchdog.sh        (run in foreground)
#               nohup ./scripts/phone_watchdog.sh > /dev/null 2>&1 &   (background)
# Tail logs:    tail -f watchdog.log
# Tune speed:   WATCHDOG_INTERVAL=300 ./scripts/phone_watchdog.sh   (5-min polling)
# Stop:         pkill -f phone_watchdog.sh

cd "$(dirname "$0")/.."

INTERVAL=${WATCHDOG_INTERVAL:-60}
LOG=watchdog.log

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

start_server() {
    NODE_ENV=production nohup node server.js > server.log 2>&1 &
    sleep 3
}

start_tunnel() {
    command -v cloudflared >/dev/null 2>&1 || return 0
    nohup cloudflared tunnel --url http://localhost:3000 > cloudflared.log 2>&1 &
    sleep 3
}

ensure_server() {
    if ! pgrep -f "node server.js" >/dev/null; then
        log "Server is down. Restarting..."
        start_server
    fi
}

ensure_tunnel() {
    if ! pgrep -f "cloudflared tunnel" >/dev/null; then
        log "Cloudflare tunnel is down. Restarting..."
        start_tunnel
    fi
}

check_updates() {
    git fetch origin main --quiet 2>>"$LOG" || { log "git fetch failed (network?)"; return; }
    local local_head=$(git rev-parse HEAD 2>/dev/null)
    local remote_head=$(git rev-parse origin/main 2>/dev/null)
    [ -z "$local_head" ] || [ -z "$remote_head" ] && return
    [ "$local_head" = "$remote_head" ] && return

    log "Update found: ${local_head:0:7} -> ${remote_head:0:7}. Pulling..."
    if ! git pull --rebase origin main >>"$LOG" 2>&1; then
        log "Pull failed. Will retry next cycle."
        return
    fi

    log "Pull OK. Rebuilding..."
    if ! npm run build >>"$LOG" 2>&1; then
        log "BUILD FAILED. Keeping previous version running. Fix the bad commit and push again."
        return
    fi

    log "Build OK. Restarting server..."
    pkill -f "node server.js" 2>/dev/null
    sleep 1
    start_server
    log "Server restarted on new commit ${remote_head:0:7}."
}

log "Watchdog started (interval=${INTERVAL}s)"
termux-wake-lock 2>/dev/null || true

while true; do
    ensure_server
    ensure_tunnel
    check_updates
    sleep "$INTERVAL"
done
