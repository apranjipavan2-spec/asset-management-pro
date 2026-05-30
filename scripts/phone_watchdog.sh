#!/data/data/com.termux/files/usr/bin/bash
# Watchdog: keeps server + Cloudflare tunnel alive, auto-pulls from GitHub,
# runs new DB migrations, rotates logs, and adapts polling speed.
#
# Usage:        ./scripts/phone_watchdog.sh        (run in foreground)
#               nohup ./scripts/phone_watchdog.sh > /dev/null 2>&1 &
# Tail logs:    tail -f watchdog.log
# Stop:         pkill -f phone_watchdog.sh
#
# Tunables (env vars):
#   WATCHDOG_INTERVAL_IDLE  default 60   seconds between polls when nothing's changing
#   WATCHDOG_INTERVAL_HOT   default 15   polling speed for 5 min after a change is detected
#   WATCHDOG_HEALTH_URL     default http://localhost:3000   what to curl for health
#   WATCHDOG_LOG_MAX        default 5    MB before each log file is truncated

cd "$(dirname "$0")/.."

IDLE=${WATCHDOG_INTERVAL_IDLE:-60}
HOT=${WATCHDOG_INTERVAL_HOT:-15}
HOT_DURATION=300   # seconds to stay in hot mode after a change
HEALTH_URL=${WATCHDOG_HEALTH_URL:-http://localhost:3000}
LOG_MAX_MB=${WATCHDOG_LOG_MAX:-5}
LOG=watchdog.log

hot_until=0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

start_server() {
    NODE_ENV=production nohup node server.js > server.log 2>&1 &
    sleep 3
}

start_tunnel() {
    command -v cloudflared >/dev/null 2>&1 || return 0
    nohup cloudflared tunnel --url http://localhost:3000 > cloudflared.log 2>&1 &
    sleep 3
    # Capture URL into a file so the user can `cat current_url.txt` any time
    for i in $(seq 1 20); do
        sleep 1
        local url
        url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' cloudflared.log 2>/dev/null | head -1)
        if [ -n "$url" ]; then
            echo "$url" > current_url.txt
            log "Tunnel URL: $url"
            return
        fi
    done
    log "Tunnel started but URL not captured in 20s."
}

ensure_server_alive() {
    if ! pgrep -f "node server.js" >/dev/null; then
        log "Server process is down. Restarting..."
        start_server
        return
    fi
    # Process is up but is it actually serving? Curl with 5s timeout.
    if command -v curl >/dev/null 2>&1; then
        if ! curl -fs -m 5 -o /dev/null "$HEALTH_URL"; then
            log "Server is hung (no response from $HEALTH_URL). Killing and restarting..."
            pkill -f "node server.js" 2>/dev/null
            sleep 2
            start_server
        fi
    fi
}

ensure_tunnel_alive() {
    if ! pgrep -f "cloudflared tunnel" >/dev/null; then
        log "Cloudflare tunnel is down. Restarting..."
        start_tunnel
    fi
}

run_migrations_if_any() {
    [ -d migrations ] || return 0
    [ -z "$(ls -A migrations 2>/dev/null)" ] && return 0
    log "Checking for new DB migrations..."
    if npm run db:migrate >>"$LOG" 2>&1; then
        log "Migrations check OK."
    else
        log "Migration FAILED. Investigate watchdog.log."
    fi
}

check_updates() {
    git fetch origin main --quiet 2>>"$LOG" || { log "git fetch failed (network?)"; return; }
    local local_head remote_head
    local_head=$(git rev-parse HEAD 2>/dev/null)
    remote_head=$(git rev-parse origin/main 2>/dev/null)
    [ -z "$local_head" ] || [ -z "$remote_head" ] && return
    [ "$local_head" = "$remote_head" ] && return

    log "Update found: ${local_head:0:7} -> ${remote_head:0:7}. Pulling..."
    if ! git pull --rebase origin main >>"$LOG" 2>&1; then
        log "Pull failed. Will retry next cycle."
        return
    fi

    run_migrations_if_any

    log "Rebuilding frontend..."
    if ! npm run build >>"$LOG" 2>&1; then
        log "BUILD FAILED. Keeping previous version running. Fix the bad commit and push again."
        return
    fi

    log "Build OK. Restarting server..."
    pkill -f "node server.js" 2>/dev/null
    sleep 1
    start_server
    log "Server restarted on commit ${remote_head:0:7}."

    # Go hot: poll fast for the next HOT_DURATION seconds in case more pushes are coming
    hot_until=$(( $(date +%s) + HOT_DURATION ))
}

rotate_logs() {
    local max_bytes=$(( LOG_MAX_MB * 1024 * 1024 ))
    for f in server.log cloudflared.log watchdog.log; do
        [ -f "$f" ] || continue
        local size
        size=$(stat -c%s "$f" 2>/dev/null || echo 0)
        if [ "$size" -gt "$max_bytes" ]; then
            mv "$f" "$f.old"
            : > "$f"
            log "Rotated $f (was ${size} bytes)"
        fi
    done
}

current_interval() {
    if [ "$(date +%s)" -lt "$hot_until" ]; then
        echo "$HOT"
    else
        echo "$IDLE"
    fi
}

log "Watchdog started (idle=${IDLE}s, hot=${HOT}s, health=${HEALTH_URL})"
termux-wake-lock 2>/dev/null || true

cycle=0
while true; do
    ensure_server_alive
    ensure_tunnel_alive
    check_updates
    cycle=$(( cycle + 1 ))
    # Rotate logs every 60 cycles (~ every hour at default idle)
    [ $(( cycle % 60 )) -eq 0 ] && rotate_logs
    sleep "$(current_interval)"
done
