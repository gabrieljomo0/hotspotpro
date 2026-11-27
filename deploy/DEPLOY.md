# Hosting HotspotPro on a server

Cloud voucher login (captive portal → HotspotPro RADIUS) needs **UDP 1812 and 1813**
reachable from every MikroTik. Render cannot do that — use a VPS, Docker Compose, or Fly.io.

You need a Linux server (a small VPS is fine) with a public IP address, a domain name pointing at it,
and Node.js 20+. These steps use Ubuntu.

## Fast path: Docker Compose (RADIUS on)

```bash
cp backend/.env.example backend/.env
# set HOTSPOTPRO_PUBLIC_URL=https://billing.example.com
# set HOTSPOTPRO_RADIUS_HOST=<this machine's public IPv4>
# set HOTSPOTPRO_RADIUS=on
docker compose up -d --build
sudo ufw allow 1812,1813/udp && sudo ufw allow 80,443/tcp
```

Then put Caddy/nginx in front of port 4000 for HTTPS. In the dashboard, add a router with
**Cloud RADIUS** (default when RADIUS is on). WiFi opens the site portal; Connect authenticates
vouchers via RADIUS.

## Fast path: Render API + UDP edge on a public IP (no Fly card)

Render cannot receive UDP. Keep the API on Render, open **Cloud RADIUS**, and run a tiny
UDP forwarder on any machine with a public IPv4 (this PC, a VPS, etc.):

```bash
# On Render (Environment):
#   HOTSPOTPRO_RADIUS=on
#   HOTSPOTPRO_RADIUS_LISTEN=off
#   HOTSPOTPRO_RADIUS_HOST=<your public IPv4>
#   HOTSPOTPRO_RADIUS_SECRET=<shared secret>

# On the public-IP machine:
cd backend
set HOTSPOTPRO_BACKEND_URL=https://hotspotpro-api.onrender.com
set HOTSPOTPRO_RADIUS_SECRET=<same shared secret>
node scripts/radius-edge.mjs
# Windows: allow UDP 1812 and 1813 inbound (admin). RouterOS /radius address = that IPv4.
```

Set each router to **Cloud RADIUS**, then re-paste the setup command so `/radius` points at the edge IP.

## Fast path: Fly.io (UDP + HTTPS on one host)

```bash
fly auth login
fly launch --no-deploy   # uses fly.toml in the repo root
fly ips allocate-v4      # required for UDP — needs a card on Fly ($2/mo dedicated IPv4)
fly secrets set HOTSPOTPRO_PUBLIC_URL=https://your-app.fly.dev \
  HOTSPOTPRO_RADIUS_HOST=<that dedicated IPv4> \
  HOTSPOTPRO_RADIUS=on \
  HOTSPOTPRO_SESSION_SECRET=<long-random> \
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...   # if you already use Supabase
fly deploy
```

Point the Vercel site’s API rewrite at `https://your-app.fly.dev`. Set each router to **Cloud RADIUS**.

## 1. Put the project on the server

```bash
sudo mkdir -p /opt/hotspotpro && sudo chown $USER /opt/hotspotpro
# upload and unzip so that /opt/hotspotpro/backend and /opt/hotspotpro/frontend exist
cd /opt/hotspotpro/frontend && npm install && npm run build
```

## 2. Settings (backend/.env)

```bash
cd /opt/hotspotpro/backend && cp .env.example .env && nano .env
```

Set at least:

```
HOTSPOTPRO_PUBLIC_URL=https://billing.example.com
HOTSPOTPRO_SETUP_CODE=choose-a-secret-code
HOTSPOTPRO_RADIUS_HOST=<your server's public IP>
```

`HOTSPOTPRO_SETUP_CODE` stops a stranger who finds the new site from creating the super admin account before you do.

## 3. Start both parts and keep them running

Either use systemd (recommended): copy `deploy/hotspotpro-backend.service` and `deploy/hotspotpro-web.service`
to `/etc/systemd/system/`, fix the paths and user inside, then
`sudo systemctl daemon-reload && sudo systemctl enable --now hotspotpro-backend hotspotpro-web`.

Or, quick and simple: `cd /opt/hotspotpro && node run-all.mjs --prod` (inside `tmux`/`screen` so it keeps running).

## 4. HTTPS with Caddy

Install Caddy (https://caddyserver.com/docs/install), copy `deploy/Caddyfile`, put your domain in it and run it
(`sudo caddy run --config Caddyfile`, or use the Caddy service). It gets the certificate by itself.

## 5. Firewall

Open: 80 and 443 (TCP) for the website, and **UDP 1812 and 1813** for RADIUS (routers asking whether a voucher is valid).
Keep ports 3000 and 4000 closed to the internet; only Caddy talks to them.

```bash
sudo ufw allow 80,443/tcp && sudo ufw allow 1812,1813/udp && sudo ufw enable
```

## 6. Create the super admin account

Open https://billing.example.com and click **Create one**. Enter the setup code. The first account becomes the **super admin**
(open the platform area from the **Super admin** link in the landing page footer, `/super-admin`). Anyone who signs up after that gets their own separate business account, unless you
switch public sign-up off in Platform → Settings. Your own dashboard is at `/dashboards`.

## Backups and updates

- Everything lives in `backend/data` (`db.json`, `secret.key`). Copy that folder regularly.
- Forgot a password: stop the backend, then `cd backend && node scripts/reset-password.mjs you@example.com "new-password"`.
- Update: upload the new files over the old ones (keep `backend/data` and `backend/.env`), `npm run build` in `frontend`, restart both services.

## Testing a router against the hosted site

Add the router from the dashboard (Configuration → Routers → Add router). The address box should show your
`https://billing.example.com`. Paste the command into the MikroTik terminal. The router calls back over https,
and RADIUS goes to your server's IP on UDP 1812/1813.
