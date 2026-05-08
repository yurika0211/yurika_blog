#!/bin/sh
set -eu

python3 /app/og_server.py &

exec nginx -g 'daemon off;'
