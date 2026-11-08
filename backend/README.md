# HotspotPro backend

Everything server-side lives here. The `frontend/` folder contains no server code.

## Run

```bash
cd backend
npm start          # runs the prebuilt dist/server.mjs — needs Node 20+, no npm install
```

Listens on **http://localhost:4000** (all network interfaces) and starts the RADIUS server on UDP 1812/1813.
Check it: http://localhost:4000/api/health. Normally you start it together with the website using
`node run-all.mjs` in the project folder.

| Command | What it does |
|---|---|
| `npm start` | Run the prebuilt bundle |
| `npm run dev` | Auto-restart on code changes (`npm install` first) |
| `npm run build` | Rebuild `dist/server.mjs` after editing code (`npm install` first) |
| `npm run routes` | Regenerate `src/http/routeTable.ts` after adding/removing a route file |
| `npm run typecheck` | TypeScript check |
| `npm test` | Smoke tests against throw-away data folders (accounts, business isolation, super admin, RADIUS routing, upgrade from the old file) |

## Layout

- `src/index.ts` loads `.env`, then `src/main.ts` starts HTTP + RADIUS.
- `src/http/` Node server adapter, generated route table, small `next/server` shim.
- `src/routes/api/**/route.ts` every API endpoint (auth, state, packages, purchase, payments, routers, provisioning, agents, SMS, RADIUS usage, webhooks) plus `api/super/*`, the super admin API.
- `src/server/` the logic: store (JSON DB, one separate partition per business), tenancy (which business a request is about), auth, RADIUS, payments, SMS, RouterOS provisioning, control, usage, super admin stats.
- `data/` created on first start: `db.json`, `secret.key`. Back this up.
- `.env.example` all settings (`PORT`, `HOTSPOTPRO_DATA_DIR`, `HOTSPOTPRO_PUBLIC_URL`, admin login, Hubtel, SMS …).

## Notes

- Data is a JSON file: fine for one business on one machine; replace `src/server/store.ts` with a real database to scale.
- Routers must reach this server directly on port 4000 (and UDP 1812/1813), not through the website.
- Not tested against a real MikroTik, Hubtel or SMS provider.

## Many businesses, one server

Every business is a *tenant*: its own partition inside `data/db.json`. The HTTP adapter decides the tenant before a route runs
(signed-in person's business, or the router setup token / payment reference for routers and customers) and the store only ever
touches that tenant's data. A request with no tenant that tries to read business data fails instead of guessing.
`/api/super/*` is only for the super admin. See `src/server/tenancy.ts` and `src/server/store.ts`.
