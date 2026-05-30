#!/data/data/com.termux/files/usr/bin/bash
# Start the Kalike server + Cloudflare tunnel on the phone (Termux) in production
# mode, both backgrounded so the Termux terminal stays usable. Always rebuilds
# the frontend so any code pulled from git is actually served.
# Logs: server.log and cloudflared.log
#
# Usage from project root:   ./scripts/phone_start.sh
# View live logs:            tail -f server.log     OR   tail -f cloudflared.log
# Stop everything:           pkill -f 'node server.js'; pkill -f cloudflared

cd "$(dirname "$0")/.."

# Kill any existing instances
pkill -f "node server.js" 2>/dev/null || true
pkill -f "cloudflared" 2>/dev/null || true
sleep 1

# Keep Termux alive so Android doesn't suspend us
termux-wake-lock 2>/dev/null || true

# Always rebuild — ensures the latest src/ code is what the server serves.
echo "Building frontend (~1 minute)..."
npm run build || { echo "Build failed. Aborting."; exit 1; }

echo "Starting server (production mode)..."
NODE_ENV=production nohup node server.js > server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 3

if ! grep -q "running at http" server.log 2>/dev/null; then
    echo "Server may have failed to start. Last 20 lines:"
    tail -20 server.log
    echo "Aborting before starting tunnel."
    exit 1
fi
echo "OK — server is up on localhost:3000"

# Start Cloudflare tunnel
if ! command -v cloudflared >/dev/null 2>&1; then
    echo
    echo "WARNING: cloudflared not installed. Server is running locally only."
    echo "To install: pkg install cloudflared"
    exit 0
fi

echo
echo "Starting Cloudflare tunnel..."
nohup cloudflared tunnel --url http://localhost:3000 > cloudflared.log 2>&1 &
TUNNEL_PID=$!
echo "Tunnel PID: $TUNNEL_PID"

# Wait for the public URL to appear in the log (up to ~20s)
PUBLIC_URL=""
for i in $(seq 1 20); do
    sleep 1
    PUBLIC_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' cloudflared.log 2>/dev/null | head -1)
    [ -n "$PUBLIC_URL" ] && break
done

echo
echo "=============================================="
if [ -n "$PUBLIC_URL" ]; then
    echo "PUBLIC URL: $PUBLIC_URL"
    echo "Open that in any browser. Same URL works on laptop and phone."
else
    echo "Tunnel started but no URL captured yet. Check cloudflared.log:"
    tail -10 cloudflared.log
fi
echo "=============================================="
echo
echo "Server log:    tail -f server.log"
echo "Tunnel log:    tail -f cloudflared.log"
echo "Stop all:      pkill -f 'node server.js'; pkill -f cloudflared"
