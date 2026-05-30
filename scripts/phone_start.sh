#!/data/data/com.termux/files/usr/bin/bash
# Start the Kalike server on the phone (Termux) in production mode, backgrounded
# so the Termux terminal stays usable. Always rebuilds the frontend so any
# code pulled from git is actually served. Logs go to server.log.
#
# Usage from project root:   ./scripts/phone_start.sh
# View live logs:            tail -f server.log
# Stop the server:           pkill -f 'node server.js'

cd "$(dirname "$0")/.."

# Kill any existing server instance
pkill -f "node server.js" 2>/dev/null || true
sleep 1

# Keep Termux alive so Android doesn't suspend the server
termux-wake-lock 2>/dev/null || true

# Always rebuild — ensures the latest src/ code is what the server serves.
echo "Building frontend (~1 minute)..."
npm run build || { echo "Build failed. Aborting."; exit 1; }

echo "Starting server (production mode)..."
NODE_ENV=production nohup node server.js > server.log 2>&1 &
PID=$!
echo "Server PID: $PID"
sleep 3

echo
echo "===== Recent log ====="
tail -20 server.log
echo "======================"
echo
if grep -q "running at http" server.log 2>/dev/null; then
    echo "OK — server is up. Open your Cloudflare URL in a browser."
else
    echo "Server may have failed to start. Check the log above."
fi
echo
echo "Logs:  tail -f server.log"
echo "Stop:  pkill -f 'node server.js'"
