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

# Absolute path to this script so we can re-exec ourselves after a self-update
# (a running bash process keeps the old code in memory until re-exec'd).
SELF="$(pwd)/scripts/phone_watchdog.sh"

IDLE=${WATCHDOG_INTERVAL_IDLE:-30}
HOT=${WATCHDOG_INTERVAL_HOT:-10}
HOT_DURATION=300   # seconds to stay in hot mode after a change
HEALTH_URL=${WATCHDOG_HEALTH_URL:-http://localhost:3000}
LOG_MAX_MB=${WATCHDOG_LOG_MAX:-5}
# Cloudflare quick tunnels print "it may take some time to be reachable" —
# edge propagation routinely takes 30-60s after the connection registers.
# Don't let the reachability check kill a tunnel inside this window, or we
# create an endless churn: kill -> new URL -> killed again before it can go
# live -> no URL ever survives long enough to work (the 1033 you keep seeing).
TUNNEL_GRACE=${WATCHDOG_TUNNEL_GRACE:-90}
LOG=watchdog.log

hot_until=0
# When the live tunnel was last (re)started. start.sh launches the first one
# immediately before this script, so treat "now" as its start time.
tunnel_started_at=$(date +%s)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

start_server() {
    NODE_ENV=production nohup node server.js > server.log 2>&1 &
    sleep 3
}

start_tunnel() {
    command -v cloudflared >/dev/null 2>&1 || return 0
    # Reset the grace clock: a freshly-spawned tunnel needs time to propagate
    # before the reachability check is allowed to judge (and kill) it.
    tunnel_started_at=$(date +%s)
    # Truncate so a previous run's dead URL can't be grepped as the "current" one.
    : > cloudflared.log
    nohup cloudflared tunnel --url http://localhost:3000 > cloudflared.log 2>&1 &
    sleep 3
    # Capture URL into a file so the user can `cat current_url.txt` any time.
    # Use tail -1 so we pick up the freshest URL if cloudflared re-announces.
    for i in $(seq 1 20); do
        sleep 1
        local url
        url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' cloudflared.log 2>/dev/null | tail -1)
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
    # 1. Process must exist
    if ! pgrep -f "cloudflared tunnel" >/dev/null; then
        log "Cloudflare tunnel process is down. Restarting..."
        start_tunnel
        hot_until=$(( $(date +%s) + HOT_DURATION ))
        return
    fi
    # 2. Don't health-check-kill a tunnel that's still inside its propagation
    #    grace window. The process is up; the Cloudflare edge just hasn't routed
    #    it yet. Killing here is what caused the endless new-URL churn.
    if [ $(( $(date +%s) - tunnel_started_at )) -lt "$TUNNEL_GRACE" ]; then
        return
    fi
    # 3. Process is up and past grace — is it actually reachable from the
    #    internet? A hung-but-alive cloudflared causes Error 1033 on the public
    #    URL; pgrep can't catch that, only an end-to-end curl can. Require three
    #    spaced failures so a transient blip doesn't trigger a needless restart.
    command -v curl >/dev/null 2>&1 || return
    local public_url
    [ -f current_url.txt ] && public_url=$(cat current_url.txt 2>/dev/null)
    [ -z "$public_url" ] && return
    local fails=0 i
    for i in 1 2 3; do
        if curl -fsS -m 8 -o /dev/null "$public_url"; then
            return   # reachable — all good
        fi
        fails=$(( fails + 1 ))
        [ "$i" -lt 3 ] && sleep 3
    done
    if [ "$fails" -ge 3 ]; then
        log "Tunnel unreachable through $public_url after 3 checks (Error 1033 territory). Restarting..."
        pkill -f "cloudflared tunnel" 2>/dev/null
        sleep 2
        start_tunnel
        hot_until=$(( $(date +%s) + HOT_DURATION ))
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

# One snapshot per calendar day, keep last 30
daily_backup() {
    [ -f db.sqlite ] || return 0
    mkdir -p backups
    local snap="backups/db-$(date +%F).sqlite"
    if [ ! -f "$snap" ]; then
        cp db.sqlite "$snap" && log "Backup: $snap"
    fi
    ls -1t backups/db-*.sqlite 2>/dev/null | tail -n +31 | xargs -r rm -f
}

# If a bank master xlsx is present and the table is empty, import it
maybe_import_bank() {
    [ -f master_bank_details.xlsx ] || return 0
    local count
    count=$(node -e "try{const{DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('./db.sqlite');console.log(db.prepare('SELECT COUNT(*) AS c FROM bank_accounts').get().c)}catch(e){console.log(0)}" 2>/dev/null)
    if [ "${count:-0}" = "0" ]; then
        log "Bank master xlsx present + table empty → importing..."
        npm run db:import-bank master_bank_details.xlsx >>"$LOG" 2>&1 || log "Bank import FAILED."
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

    # Which files did this update touch? Used below to decide whether the
    # watchdog must re-exec itself to load its own new logic.
    local changed
    changed=$(git diff --name-only "$local_head" HEAD 2>/dev/null)

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

    # If this update changed the watchdog itself, the running process is still
    # executing the OLD code. Re-exec so the new logic takes effect immediately
    # — server + tunnel are already up, so the fresh instance just resumes
    # supervising them (no manual kill/restart ever needed for watchdog fixes).
    if echo "$changed" | grep -q 'scripts/phone_watchdog.sh'; then
        log "Watchdog script changed in ${remote_head:0:7} — re-executing self to load new logic."
        exec bash "$SELF"
    fi
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
    maybe_import_bank
    cycle=$(( cycle + 1 ))
    # Daily backup once per hour (one snapshot per day is enforced inside)
    [ $(( cycle % 60 )) -eq 0 ] && daily_backup
    # Rotate logs every 60 cycles (~ every hour at default idle)
    [ $(( cycle % 60 )) -eq 0 ] && rotate_logs
    sleep "$(current_interval)"
done
