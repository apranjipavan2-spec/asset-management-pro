#!/bin/bash
# Kalike Asset Server — one-shot startup script
set -e
cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════╗"
echo "║   Kalike Asset Server        ║"
echo "╚══════════════════════════════╝"
echo ""

# Always pull latest code cleanly
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

# Build frontend if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "▶ Building frontend..."
    npm run build
else
    echo "▶ Frontend build found — skipping."
fi

echo ""
echo "✓ Ready. Starting server..."
echo ""
npm start
