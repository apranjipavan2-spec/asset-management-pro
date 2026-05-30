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

# Stop any pre-existing instances
echo "▶ Stopping any running server / tunnel / watchdog..."
pkill -f "node server.js"     2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "phone_watchdog.sh"  2>/dev/null || true
sleep 2

# Keep Termux alive across screen-off (no-op on non-Termux systems)
termux-wake-lock 2>/dev/null || true

# Pull latest code cleanly
echo "▶ Pulling latest code..."
git fetch origin main
git reset --hard origin/main

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
sleep 3
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "✗ Server failed to start. Last 20 lines of server.log:"
    tail -n 20 server.log
    exit 1
fi
echo "✓ Server running on http://localhost:3000 (pid $SERVER_PID)"

# Start Cloudflare tunnel in background and capture URL
if command -v cloudflared >/dev/null 2>&1; then
    echo "▶ Starting Cloudflare tunnel (background → cloudflared.log)..."
    nohup cloudflared tunnel --url http://localhost:3000 > cloudflared.log 2>&1 &
    TUNNEL_PID=$!
    PUBLIC_URL=""
    for i in $(seq 1 25); do
        sleep 1
        PUBLIC_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' cloudflared.log 2>/dev/null | head -1)
        [ -n "$PUBLIC_URL" ] && break
    done
    if [ -n "$PUBLIC_URL" ]; then
        echo "$PUBLIC_URL" > current_url.txt
        echo "✓ Tunnel up: $PUBLIC_URL  (pid $TUNNEL_PID)"
    else
        echo "⚠ Tunnel started but URL not captured yet — check cloudflared.log."
    fi
else
    echo "⚠ cloudflared not installed. Server is local-only. Install with: pkg install cloudflared"
fi

# Kick off watchdog (auto-pull + auto-restart + log rotation)
echo "▶ Starting watchdog (auto-deploy on git push)..."
chmod +x scripts/phone_watchdog.sh 2>/dev/null
nohup ./scripts/phone_watchdog.sh > /dev/null 2>&1 &
echo "✓ Watchdog running (pid $!)"

echo ""
echo "════════════════════════════════════════════════════"
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
