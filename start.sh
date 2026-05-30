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
fi

echo ""
echo "✓ Ready. Starting server..."
echo ""
npm start
