# Deploying AdsRobotic

The app is deploy-ready. It needs three managed pieces: **Postgres** (Neon),
**Redis** (provisioned by the Render blueprint), and the **Render** web + worker
services (`render.yaml`). This guide is the exact handoff.

## 1. Provision a database (Neon)

1. Create a project at [neon.tech](https://neon.tech) (pick a region, e.g. AWS
   `us-east-2` to match Render's `ohio`).
2. Copy two connection strings:
   - **Pooled** (has `-pooler` in the host) → `DATABASE_URL`
   - **Direct** (no `-pooler`) → `DIRECT_URL` (used for migrations)

## 2. Generate secrets

```bash
# Channel-token encryption key — base64 of exactly 32 bytes:
openssl rand -base64 32
```

`SESSION_SECRET` is generated automatically by Render; you paste
`TOKEN_ENCRYPTION_KEY`, `DATABASE_URL`, and `DIRECT_URL`.

## 3. Deploy with the Render blueprint

1. Push the repo (already on GitHub `main`).
2. Render → **New → Blueprint** → pick this repo. It reads `render.yaml` and
   creates: `adsrobotic-web`, `adsrobotic-worker`, `adsrobotic-redis`, and the
   `adsrobotic-secrets` group.
3. In **Environment → adsrobotic-secrets**, set at minimum:
   - `DATABASE_URL`, `DIRECT_URL`, `TOKEN_ENCRYPTION_KEY`
4. On the **web** service set `NEXT_PUBLIC_APP_URL` to the service's URL (or your
   custom domain) — it's baked at build time **and** is the base for OAuth
   redirect URIs, so set it before the first build.
5. Deploy. The web service's `preDeployCommand` runs `prisma migrate deploy`
   against `DIRECT_URL` automatically (paid instances). On the `free` plan,
   remove `preDeployCommand` and run migrations manually (step 4 below).

### Manual migration / seed (any host)

With `DATABASE_URL` + `DIRECT_URL` exported locally or in a one-off shell:

```bash
pnpm --filter @adsrobotic/db exec prisma migrate deploy
pnpm db:seed   # optional demo data
```

## 4. Connect live advertising channels (optional)

Each channel needs its own developer app; set the credentials in
`adsrobotic-secrets` and whitelist the OAuth redirect URI:

| Channel | Secrets | Redirect URI to whitelist |
| --- | --- | --- |
| Meta | `META_ADS_APP_ID`, `META_ADS_APP_SECRET` | `${NEXT_PUBLIC_APP_URL}/api/v1/channels/meta/callback` |
| Google | `GOOGLE_ADS_CLIENT_ID/SECRET/DEVELOPER_TOKEN` | `${NEXT_PUBLIC_APP_URL}/api/v1/channels/google/callback` |
| TikTok | `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET` | `${NEXT_PUBLIC_APP_URL}/api/v1/channels/tiktok/callback` |

Real channel OAuth **requires a public HTTPS URL**, which is why this only works
once deployed (not on `localhost`). Without these, the app runs fine and the
channels simply show as “not configured”.

## 5. Health & scaling

- Health check: `GET /api/v1/health` (returns 200 when the DB is reachable).
- The worker runs the Budget Guardian sweep every `GUARDIAN_INTERVAL_MS`
  (default 5 min).
- Redis is currently reserved for future job queues / rate limiting; the app and
  worker run without it today, but the blueprint provisions it so it's ready.

## Alternative hosts

Any Node host works (Fly.io, Railway, a VM). The contract is: run
`prisma migrate deploy`, build with `pnpm --filter @adsrobotic/web build`, start
with `pnpm --filter @adsrobotic/web start`, and run the worker with
`pnpm --filter @adsrobotic/worker start`. Set the same environment variables
(see `.env.example`).
