#!/bin/bash
cd "$(dirname "$0")/.." || exit 1
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required to run Parcel Takeoff."
    exit 1
fi
node scripts/serve.js &
pid=$!
trap 'kill "$pid"' EXIT
sleep 0.4
open "http://127.0.0.1:${PORT:-4173}/web/"
wait "$pid"
