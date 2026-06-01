#!/bin/bash
# Kalike Asset Server — single entry point.
# Does one-shot setup (git pull, deps, DB init, backups, bank import, build,
# server + tunnel), then hands off to scripts/phone_watchdog.sh which keeps
# everything alive and auto-deploys new commits.
#
# Usage:          bash start.sh
# View logs:      tail -f server.log | tail -f cloudflared.log | tail -f watchdog.log
# Current URL:    cat current_url.txt
# Stop all:       pkill -f "node server.js"; pkill -f cloudflared; pkill -f phone_watchdog.sh
set -e
cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════╗"
echo "║   Kalike Asset Server        ║"
echo "╚══════════════════════════════╝"
echo ""

# Stop any pre-existing instances (use -9 as a fallback so a wedged
# process can't squat on port 3000 and silently break the new server).
echo "▶ Stopping any running server / tunnel / watchdog..."
pkill -f "node server.js"     2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "phone_watchdog.sh"  2>/dev/null || true
sleep 2
pkill -9 -f "node server.js"     2>/dev/null || true
pkill -9 -f "cloudflared tunnel" 2>/dev/null || true
pkill -9 -f "phone_watchdog.sh"  2>/dev/null || true
sleep 1

# Keep Termux alive across screen-off (no-op on non-Termux systems)
termux-wake-lock 2>/dev/null || true

# Pull latest code cleanly. Verbose + verified so silent staleness is visible.
echo "▶ Pulling latest code..."
echo "  Remote: $(git config --get remote.origin.url)"
BEFORE=$(git rev-parse HEAD 2>/dev/null || echo unknown)
echo "  Before: ${BEFORE:0:7}"

# Force refetch + prune so a corrupted remote-tracking ref can't stick
if ! git fetch --prune --force origin main; then
    echo "✗ git fetch FAILED. Check network / GitHub access on this device."
    echo "  Staying on ${BEFORE:0:7} and continuing — server will boot, but code is stale."
fi

REMOTE=$(git rev-parse origin/main 2>/dev/null || echo unknown)
echo "  Remote/main: ${REMOTE:0:7}"

if [ "$BEFORE" = "$REMOTE" ] && [ "$REMOTE" != "unknown" ]; then
    echo "  ✓ Already on latest commit."
else
    echo "  ▶ Resetting working tree to origin/main..."
    git reset --hard origin/main
    AFTER=$(git rev-parse HEAD)
    echo "  ✓ Now on ${AFTER:0:7} (was ${BEFORE:0:7})"
fi

# Install / update dependencies
echo "▶ Checking dependencies..."
npm install --silent

# Init DB only if it doesn't exist yet
if [ ! -f "db.sqlite" ]; then
    echo "▶ Initializing database..."
    npm run db:init
else
    echo "▶ Database found — skipping init."
    # Daily snapshot (one per day, keep last 30)
    mkdir -p backups
    SNAP="backups/db-$(date +%F).sqlite"
    if [ ! -f "$SNAP" ]; then
        cp db.sqlite "$SNAP"
        echo "▶ Backup created: $SNAP"
    fi
    ls -1t backups/db-*.sqlite 2>/dev/null | tail -n +31 | xargs -r rm -f
fi

# Import bank master if xlsx present and table is empty
if [ -f "master_bank_details.xlsx" ]; then
    BANK_COUNT=$(node -e "try{const{DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('./db.sqlite');console.log(db.prepare('SELECT COUNT(*) AS c FROM bank_accounts').get().c)}catch(e){console.log(0)}" 2>/dev/null)
    if [ "${BANK_COUNT:-0}" = "0" ]; then
        echo "▶ Importing bank master..."
        npm run db:import-bank master_bank_details.xlsx
    else
        echo "▶ Bank master ($BANK_COUNT rows) loaded — skipping import."
    fi
fi

# Always rebuild — guarantees latest src/ is what's served
echo "▶ Building frontend..."
npm run build >/dev/null
echo "✓ Build done."

# Start server in background
echo "▶ Starting server (background → server.log)..."
NODE_ENV=production nohup node server.js > server.log 2>&1 &
SERVER_PID=$!

# Wait for the server to actually accept HTTP — not just be a live PID.
# A process can be alive but stuck on a require() error or DB init.
echo "  Waiting for HTTP on :3000..."
SERVER_OK=0
for i in $(seq 1 20); do
    sleep 1
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "✗ Server process died. Last 30 lines of server.log:"
        tail -n 30 server.log
        exit 1
    fi
    if curl -fsS -m 2 -o /dev/null http://127.0.0.1:3000/ 2>/dev/null \
       || curl -fsS -m 2 -o /dev/null http://127.0.0.1:3000/api/login 2>/dev/null \
       || curl -sS  -m 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null | grep -qE '^(200|301|302|401|404|405)$'; then
        SERVER_OK=1
        break
    fi
done
if [ "$SERVER_OK" != "1" ]; then
    echo "✗ Server PID is alive but not answering HTTP on :3000. Last 30 lines of server.log:"
    tail -n 30 server.log
    exit 1
fi
echo "✓ Server responding on http://localhost:3000 (pid $SERVER_PID)"

# Start Cloudflare tunnel in background and capture URL
if command -v cloudflared >/dev/null 2>&1; then
    echo "▶ Starting Cloudflare tunnel (background → cloudflared.log)..."
    # Truncate the old log so we only see this run's URL.
    : > cloudflared.log
    nohup cloudflared tunnel --no-autoupdate --url http://localhost:3000 > cloudflared.log 2>&1 &
    TUNNEL_PID=$!
    PUBLIC_URL=""
    for i in $(seq 1 40); do
        sleep 1
        if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
            echo "✗ cloudflared process died. Last 30 lines of cloudflared.log:"
            tail -n 30 cloudflared.log
            break
        fi
        PUBLIC_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' cloudflared.log 2>/dev/null | head -1)
        [ -n "$PUBLIC_URL" ] && break
    done
    if [ -n "$PUBLIC_URL" ]; then
        echo "$PUBLIC_URL" > current_url.txt
        echo "  Verifying tunnel responds end-to-end..."
        TUNNEL_OK=0
        for i in $(seq 1 15); do
            sleep 2
            CODE=$(curl -sS -o /dev/null -m 6 -w '%{http_code}' "$PUBLIC_URL/" 2>/dev/null || echo 000)
            case "$CODE" in
                200|301|302|401|404|405) TUNNEL_OK=1; break ;;
            esac
        done
        if [ "$TUNNEL_OK" = "1" ]; then
            echo "✓ Tunnel up + reachable: $PUBLIC_URL  (pid $TUNNEL_PID)"
        else
            echo "⚠ Tunnel URL captured ($PUBLIC_URL) but not reachable (last code: $CODE)."
            echo "  Watchdog will retry. Last 15 lines of cloudflared.log:"
            tail -n 15 cloudflared.log
        fi
    else
        echo "⚠ Tunnel started but URL not captured. Last 30 lines of cloudflared.log:"
        tail -n 30 cloudflared.log
    fi
else
    echo "⚠ cloudflared not installed. Server is local-only. Install with: pkg install cloudflared"
fi

# Kick off watchdog (auto-pull + auto-restart + log rotation)
echo "▶ Starting watchdog (auto-deploy on git push)..."
chmod +x scripts/phone_watchdog.sh 2>/dev/null
nohup ./scripts/phone_watchdog.sh > /dev/null 2>&1 &
echo "✓ Watchdog running (pid $!)"

DEPLOYED=$(git rev-parse HEAD 2>/dev/null | cut -c1-7)
echo ""
echo "════════════════════════════════════════════════════"
echo "  DEPLOYED:    $DEPLOYED  ($(git log -1 --pretty=%s 2>/dev/null))"
if [ -n "$PUBLIC_URL" ]; then
    echo "  PUBLIC URL:  $PUBLIC_URL"
fi
echo "  LOCAL URL:   http://localhost:3000"
echo "════════════════════════════════════════════════════"
echo ""
echo "  Logs:        tail -f server.log | cloudflared.log | watchdog.log"
echo "  Current URL: cat current_url.txt"
echo "  Stop all:    pkill -f 'node server.js'; pkill -f cloudflared; pkill -f phone_watchdog.sh"
echo ""
