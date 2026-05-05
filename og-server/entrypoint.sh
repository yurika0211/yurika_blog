#!/bin/sh
# Start the OG tag server alongside nginx
# This script is called from the Docker entrypoint

echo "[entrypoint] Starting OG tag server on port 8080..."
python3 /app/og_server.py &
OG_PID=$!

echo "[entrypoint] Starting nginx on port 80..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Wait for either process to exit
wait -n $OG_PID $NGINX_PID 2>/dev/null

# If one exits, kill the other
kill $OG_PID $NGINX_PID 2>/dev/null
wait