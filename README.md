# HotspotPro — Billing Dashboard

A billing dashboard for a WiFi hotspot business, in two parts:

| Folder | What it is | Port |
|---|---|---|
| `backend/` | **All server code**: database, logins, payments, SMS, RADIUS, router setup, every `/api` route. Plain Node server, no install needed. | 4000 (+ UDP 1812/1813 RADIUS) |
| `deploy/` | Hosting files: Caddyfile, systemd services, step-by-step guide. | — |
| `frontend/` | The website only (Next.js 16 + TypeScript + Tailwind + Recharts). It forwards `/api` to the backend. | 3000 |

## How to run it

You need **Node.js 20 or newer** (https://nodejs.org). Check with `node -v`.

**Easiest:** unzip, then on Windows double-click `start.bat`; on Mac/Linux run `bash start.sh` in the project folder.
It installs the website's packages the first time, starts the backend, then the website.

**Or by hand** (project folder = the one containing `backend` and `frontend`):

```bash
node run-all.mjs        # or: npm start
```

Then open http://localhost:3000. The first time, click **Create one**: the very first account becomes the **super admin**. Signing in always opens your dashboard at /dashboards; the platform area is the **Super Admin** link in the landing page footer. Next time just sign in. There is no built-in default password.
Stop everything with `Ctrl + C`. Your data is kept in `backend/data`.

**Two terminals instead:**

```bash
cd backend  && npm start                   # needs no install; API on http://localhost:4000
cd frontend && npm install && npm run dev  # website on http://localhost:3000
```

For backend development with auto-restart: `cd backend && npm install && npm run dev`.

### Settings (optional)

Everything works without settings. To change the data folder, ports, the public address routers use, or to
set a **setup code**, copy `backend/.env.example` to `backend/.env`, edit it and restart. If the backend is not on
this computer, set `HOTSPOTPRO_BACKEND_URL` for the frontend (default `http://127.0.0.1:4000`).

### Accounts, businesses and the super admin

HotspotPro is a platform for many WiFi businesses on one server:

- **Super admin** (the first account ever created): oversees everything at **/super-admin** (footer link on the landing page; signing in never sends you there by itself). Click any business to see everything it does (activity, payments, SMS, routers, saved data) and press **Open its dashboard** to see its dashboard exactly as the owner does. It shows every business, its owner,
  routers, vouchers, customers online, payments, SMS, webhook callbacks and a full activity log. They can open any business's
  dashboard with full access (**Open its dashboard**), suspend or reactivate a business, set a temporary password for an owner,
  delete a business (typing its name to confirm), write private notes, and switch public sign-up on or off. Their own
  business (their own routers) is always at /dashboards.
- **Businesses**: anyone can click **Create one** on the login page and gets their own completely separate workspace
  (routers, vouchers, packages, agents, installers, payments, settings). They start empty, with no sample data. Business A can never see business B's data.
- **Agents and installers** belong to the business that created them and sign in on the same login page.
- **Customers** reach a business's captive portal through the link on its routers (it carries that router's setup code, which tells the platform which business it is).
- **RADIUS** is shared by the whole platform: a voucher login is matched to the business that issued the voucher.
- A suspended business is locked out (owner, agents, portal and new RADIUS logins); its routers keep their current state.

Upgrading from the single-business version: your existing account becomes the super admin and keeps all its data as the first business.

### Database, testing first, updating

See **`UPDATING-AND-DATABASE.txt`**: the database is one JSON file (`backend/data/db.json`) with automatic safety copies; `start-test.bat` runs a separate test copy (web 3100) beside the real site (web 3000) so updates can be tried without touching live users; and how to update safely.

### Adding a real router

See **`ROUTER-SETUP-GUIDE.txt`**: Windows firewall rules, resetting the MikroTik, the Add router page, what the script configures, and how to test with a voucher.

### Hosting it for real

See **`deploy/DEPLOY.md`**: domain + https (Caddy config included), systemd services, firewall (UDP 1812/1813 for RADIUS),
and first-time setup. In short: `node run-all.mjs --prod`, set `HOTSPOTPRO_SETUP_CODE` and `HOTSPOTPRO_PUBLIC_URL`, then
open the site and create the first (super admin) account. On a live server (production mode) the sample agents/installers from the old
demo data cannot sign in. Settings → **Start over** clears a business's data.

### Upgrading from the single-folder version

If you have saved data in `frontend/data`, the launcher copies it to `backend/data` once, automatically.

### If something goes wrong

- `npm install` fails: check your internet and that `node -v` shows 20 or higher.
- "Port in use" / RADIUS "EADDRINUSE": an older HotspotPro is usually still running in another window. Close it (or on Windows run `taskkill /IM node.exe /F`). The launcher now moves the website to the next free port by itself and tells you which one.
- Port busy: `WEB_PORT=3003 node run-all.mjs` (website) or `HOTSPOTPRO_BACKEND_PORT=4100 node run-all.mjs` (backend).
- Website loads but shows errors/blank data: the backend is not running. Open http://localhost:4000/api/health.
- Forgot a password (the super admin's, or any owner's): stop everything, then `cd backend && node scripts/reset-password.mjs you@example.com "new-password"` (keeps your data).

## Signing in

- Owner: the account you created on first visit (sign-up closes after that)
- Agents sign in from the same login page with the details the admin gives them
  (Agents → open an agent → copy the login link / details).

## The backend

**What it does**

- **Sign-in for everyone** (admin, agents, installers) is checked on the server. Admin passwords are
  stored hashed; the session is a signed cookie (7 days). Pages are protected: `/dashboards` is
  admin-only, an agent can only open their own `/agent-portal/<id>`.
- **All your data is saved on the server** in `backend/data/db.json` and shared between browsers/computers
  (changes appear within a few seconds). Agents/installers can't read or change admin-only settings
  and never receive other people's passwords.
- **Customers buy online.** The WiFi portal lists the real packages for the router and starts a
  Mobile Money payment (MTN, Telecel, AT) through Hubtel. When the money is confirmed the server issues
  the voucher **once**, records the sale, texts the code, and the customer is logged in.
  Lost callbacks are recovered by asking Hubtel directly; callbacks are verified before they are trusted;
  underpayments are rejected.
- **RADIUS server (UDP 1812/1813).** Routers ask it whether a voucher may get online. The answer carries
  the time left, the data left and the speed, so **the router itself cuts the user off** when time or data
  run out. The first login starts the voucher's clock; data used is added up from the router's usage
  reports; devices-per-voucher is enforced; Active Users in the dashboard follow the real sessions.
- **Router setup link.** *Add router* gives a command that downloads the router's script from this server
  (WAN, hotspot network + DHCP, hotspot with RADIUS, walled garden, optional WiFi, a login page that
  forwards customers to the portal). The page finishes only when the router really calls back.
- **SMS** through Hubtel or Africa's Talking (Settings → SMS). Every message, sent or not, is in the SMS log.
- **Sales ledger** on the server: every online payment (with the commission owed) —
  `GET /api/payments`, `GET /api/reports/sales?period=this-month|last-month|all`.
- Settings → Payments (bottom) shows the Hubtel callback address, the RADIUS details and the latest payments.

**Going live checklist** (everything above works in test mode without these)

1. Run the server on a machine with a public address and HTTPS (put it behind a reverse proxy such as
   Caddy or nginx), and set `HOTSPOTPRO_PUBLIC_URL` and `HOTSPOTPRO_RADIUS_HOST` (the public **IP**).
2. Open UDP ports 1812 and 1813 to your routers.
3. Settings → Payments: enter your Hubtel API ID, key and Collection Account Number and switch
   Sandbox mode off. Settings → SMS: pick Hubtel or Africa's Talking, enter its details and switch it on.
4. Add a router, run the command in its terminal. Try a test purchase before real customers do.

**Honest limits**

- **Never tested against a real MikroTik router or a real Hubtel/SMS account** — I could only test against
  my own RADIUS client and simulated gateways. The first real try may need small fixes (RouterOS script
  details differ between versions; try it on a spare router first).
- Mambo SMS and JulySMS are listed in Settings but not connected (SMS to them is logged as failed).
- Speed throttling after a data threshold, bursts and schedules in packages are not applied by RADIUS yet
  (time limit, data cap, speed and device count are).
- Agent cash sales/commission payouts to agents still follow the dashboard's own figures; the server
  ledger covers online customer payments.
- Finer per-permission rules (e.g. "this agent only touches their own vouchers") are still enforced
  by the screens only. Two people editing the same list at once: the last save wins.
- One server process and one JSON file — fine for a small business; move to Postgres when you grow
  (only `backend/src/server/store.ts` needs replacing). Back up by copying the `backend/data` folder.
- Webhooks from your WhatsApp provider are recorded but not acted on.

## Data usage for each router

Open **Configuration → Routers**, click a router, and open the **Data Usage** tab (a one-line summary also sits under the router's name on every tab). It shows, for that router only:

- **Live**: download and upload speed right now, customers online, and a table of who is online (voucher, package, device, how long, data used, speed, data left). Speeds are the average over the router's last report (about a minute).
- **Data used**: today, this week, this month and all time, each split into download and upload.
- **Charts**: data over the last 24 hours / 7 days / 30 days, and the busiest hours of the day.
- **Top users**, **usage by package**, **recent sessions** and the average session length.
- The router's **Reports** tab now shows the real session count, average session length and data used this month.

Where it comes from: the router reports each customer's data to this server (RADIUS accounting) when they connect, every minute while they are online, and when they leave. So nothing appears until a customer has connected through that router, and the router must be able to reach this computer on UDP 1812/1813.

How a report is matched to a router: by the router's address if you typed one in, otherwise by its name (the setup script gives a new router its name as its identity, and MikroTik sends that identity with every report). If reports arrive from a router the app can't match, the Data Usage tab lists them with a **This is <router>** button to link them.

To see the page filled in without any router: **Show sample traffic** (test only, switched off on a live server unless `HOTSPOTPRO_ALLOW_SIMULATE=1`; **Remove sample data** clears it).

Note: customers connected before this update report from the start of their next session; history starts from the first report received. The older **Analytics → Data Usage** page still shows demonstration figures.

## Disconnect / Reconnect a router (cut and restore its internet)

**Configuration → Routers → Actions (⋮) → Disconnect** (and the same in **More Actions** on a router's page). When a router is disconnected the item becomes **Reconnect**.

What Disconnect does: everyone on that router loses internet and is signed out, and new logins through it are refused ("Internet is switched off on this router") until you Reconnect. Voucher time keeps counting meanwhile.

What you see:
- **Red**: a "Disconnected" tag next to the router's name in the lists, and a red banner at the top of its page — "Router disconnected — internet is cut" (with a Reconnect button).
- **Red, "Router lost internet"**: shown when the router itself stops contacting HotspotPro for 2+ minutes (it lost its internet connection or power).
- **Green, "Back online"**: shown for 10 minutes after you Reconnect, and also when a router that had lost contact starts talking to HotspotPro again (it says how long it was down). The green banner can be dismissed.

How it reaches the router: the router asks this server every 30 seconds (a small scheduler the setup script installs) and applies the answer — three firewall rules named "HotspotPro internet off" in the router's RAW table are enabled or disabled. So it takes up to 30 seconds to take effect, and the router must be able to reach this server. If the server can't be reached, the router keeps the last state it had. Those same requests are how the app knows the router is alive.

Routers set up **before** this update don't have the scheduler yet. Their red banner shows a one-line command to paste once in WinBox → New Terminal (pick the address the router can reach). New routers get it automatically from the setup command. Until then, Disconnect still refuses new logins but cannot cut people already online, and the "lost internet" warning cannot appear.

Not covered: PPPoE-only routers (this controls the hotspot network).

## Testing a router setup before deployment

On **Add router → Continue to Command** you now get three things:

1. **Address the router will use.** A router can't reach `localhost`. The box is filled with this
   computer's address on your network (for example `http://192.168.1.50:4000`, the backend port); pick the one on the
   same network as the router. If Windows asks, allow Node.js through the firewall (private networks),
   otherwise the router can't reach the page.
2. **Check script** builds the exact script the router would download and checks it without a router:
   quotes and brackets, escaping, IP addresses and ranges, the gateway being inside the network, the
   RADIUS and hotspot steps all being present, and anything pointing at localhost. **Show script** /
   **Download .rsc** let you read or import it yourself.
3. **Pretend a router ran it** (testing only; off on a live server) completes the setup as if a router
   had checked in, so you can try the dashboard, portal and test payments with no hardware.

For a REAL test without buying anything, use MikroTik's free virtual router **CHR** (RouterOS 7) in
VirtualBox or VMware: give it two network adapters (ether1 = internet/NAT, ether2 = a host-only
network your phone/PC can join), paste the command into its terminal, and watch the page finish.
Check `System → Log` on the router for lines saying `HotspotPro step failed`.

The command you paste must end with `/import hotspotpro-setup.rsc;` — if your copy shows anything
else after `/import`, the text was altered after copying.

## Good to know

- Agent dashboard: `/agent-portal/<agentId>`. What an agent sees follows the permissions
  switched on for them (Agents → open an agent → Permissions).
- In `npm run dev` customer payments are in TEST mode (an Approve button instead of real money).