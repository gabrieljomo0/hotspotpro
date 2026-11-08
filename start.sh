#!/usr/bin/env bash
# HotspotPro — one-click start for Mac / Linux:   bash start.sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install version 20 or newer from https://nodejs.org and run this again."
  exit 1
fi
exec node run-all.mjs
