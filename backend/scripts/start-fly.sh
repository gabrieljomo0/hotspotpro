#!/bin/sh
set -eu
# WinBox relay holds MikroTik Back-To-Home WireGuard on the server so admins
# only open WinBox to this host:8291 (no WireGuard on their PC).
if [ "${HOTSPOTPRO_WINBOX_RELAY:-on}" != "off" ] && [ -x /usr/local/bin/winbox-relay ]; then
  /usr/local/bin/winbox-relay &
  sleep 1
fi
exec node dist/server.mjs
