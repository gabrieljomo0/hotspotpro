#!/usr/bin/env bash
# A separate TEST COPY of HotspotPro: its own data, ports (web 3100, backend 4100) and build.
# The real site (start.sh) is never touched. Open http://127.0.0.1:3100
# Add --copy-live to start the test copy with a copy of your real data.
cd "$(dirname "$0")" && exec node run-all.mjs --test "$@"
