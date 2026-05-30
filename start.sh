#!/bin/bash
# Kalike Asset Server — one-shot startup script.
# Stops any running instance, pulls latest code, installs deps,
# runs DB init + bank master import if needed, builds frontend,
# starts server in background, then runs Cloudflare tunnel in
# foreground. Ctrl+C cleanly shuts down both.
set -e
cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════╗"
echo "║   Kalike Asset Server        ║"
echo "╚══════════════════════════════╝"
echo ""

# Stop any pre-existing instances
echo "▶ Stopping any running server / tunnel..."
pkill -f "node server.js"   2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 2

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

# Build frontend on every run (vite build is ~1s on this device)
echo "▶ Building frontend..."
npm run build

# Cleanup hook so Ctrl+C kills the background server too
cleanup() {
    echo ""
    echo "▶ Shutting down..."
    pkill -f "node server.js"   2>/dev/null || true
    pkill -f "cloudflared tunnel" 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

# Start server in background, log to server.log
echo ""
echo "▶ Starting server (background → server.log)..."
nohup npm start > server.log 2>&1 &
SERVER_PID=$!
sleep 4

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "✗ Server failed to start. Last 20 lines of server.log:"
    tail -n 20 server.log
    exit 1
fi
echo "✓ Server running on http://localhost:3000 (pid $SERVER_PID)"

# Start tunnel in foreground — its URL is what you share
echo ""
echo "▶ Starting Cloudflare tunnel..."
echo "  (Press Ctrl+C here to stop both the tunnel AND the server.)"
echo ""
cloudflared tunnel --url http://localhost:3000
