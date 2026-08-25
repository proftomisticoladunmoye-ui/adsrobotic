# AdsRobotic

**Your Autonomous AI Advertising Employee.**

Describe your business. Set your budget. Let AdsRobotic find your customers.

AdsRobotic is an AI-native, multi-channel advertising platform designed as an
_autonomous AI advertising employee_ — it learns a business, plans strategy,
generates creatives, guards the budget, and reports the real outcomes its money
achieved.

This repository contains the **MVP V1 foundation**: the monorepo, design system,
multi-tenant data model, provider abstractions for AI and ad channels, and the
marketing website.

## Monorepo layout

```
apps/
  web/                  Next.js 15 (App Router) — marketing site + app
  worker/               Background worker — Budget Guardian sweep
packages/
  config/               Design tokens, Tailwind preset, env schema, constants
  ui/                   React component library (@adsrobotic/ui)
  core/                 Server logic: auth, tenancy, brain, strategist,
                        campaigns, creative studio, smart pages, leads,
                        conversion intelligence, dashboard, assistant,
                        channels, launch, budget guardian
  db/                   Prisma schema + client (multi-tenant, ~40 entities)
  ai/                   AI orchestration: provider abstraction + 7 agents
  image/                Creative image generation (SVG poster + OpenAI adapter)
  channels/
    core/               ChannelAdapter interface, registry, mock adapter
    meta/               Meta (Facebook/Instagram) live adapter + OAuth
    google/             Google Ads live adapter + OAuth (refresh tokens)
```

## Connecting Meta (the first live channel)

1. Create a Meta app with the Marketing API and add the OAuth redirect
   `${NEXT_PUBLIC_APP_URL}/api/v1/channels/meta/callback`.
2. Set `META_ADS_APP_ID`, `META_ADS_APP_SECRET` (and optionally
   `META_GRAPH_VERSION`) in `.env`.
3. In the app, go to **Channels → Connect**, complete Meta's consent screen.
4. Create + approve a campaign, then **Launch on meta** — AdsRobotic creates it
   *paused* and only marks it active once Meta confirms the status (Spec §27).
   The Budget Guardian then pauses it on Meta if a limit is breached.

Without Meta credentials the app runs fully; the channel simply shows as “not
configured”.

## Connecting Google Ads (second live channel)

1. In Google Cloud, create an OAuth client and add the redirect
   `${NEXT_PUBLIC_APP_URL}/api/v1/channels/google/callback`.
2. Obtain a Google Ads API **developer token** (approval required for production).
3. Set `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`,
   `GOOGLE_ADS_DEVELOPER_TOKEN` (and `GOOGLE_ADS_LOGIN_CUSTOMER_ID` if you use an
   MCC/manager account) in `.env`.
4. **Channels → Connect** completes Google's offline-consent flow; AdsRobotic
   stores the encrypted **refresh token** and mints access tokens on demand.
   Google campaigns are created as a paused budget + campaign, and only marked
   active once the API confirms the status (Spec §27).

Both channels plug into the one `AdvertisingChannel` interface — the launch,
verify, and Budget-Guardian pipeline is identical regardless of channel.

## Tech stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Data:** PostgreSQL via Prisma 6 (row-scoped multi-tenancy)
- **Jobs/cache:** Redis (campaign monitoring, rate limiting) — wired in Phase 2
- **AI:** provider-agnostic; `local` on-platform default, Claude / OpenRouter gated
- **Build:** pnpm workspaces + Turborepo

## Getting started

Requires Node ≥ 20 and pnpm 9.

```bash
pnpm install
cp .env.example .env        # then fill in SESSION_SECRET, TOKEN_ENCRYPTION_KEY, DATABASE_URL
pnpm db:generate            # generate the Prisma client
pnpm dev                    # start the web app on http://localhost:3000
```

Useful commands:

```bash
pnpm typecheck              # type-check every package
pnpm lint                   # eslint across the workspace
pnpm test                   # run unit tests (config, ai, channels, core)
pnpm db:migrate             # apply migrations (needs a database)
pnpm db:seed                # load the Kampala bakery demo scenario

# End-to-end smoke test against a real (embedded) PostgreSQL — no DB setup
# needed. Exercises auth, tenancy, brain, campaigns, dashboard, assistant,
# and the Budget Guardian:
pnpm --filter @adsrobotic/web smoke

# Budget Guardian worker (needs DATABASE_URL):
pnpm --filter @adsrobotic/worker guardian:once   # one sweep
pnpm --filter @adsrobotic/worker start           # continuous (every 5 min)
```

## Design system

The brand is **White + Robotic Deep Blue**, with **Electric Cyan** reserved for
AI activity and **Signal Orange** reserved for growth/action CTAs (never
overused). All colours live in `packages/config/src/tokens.ts` as the single
source of truth and are consumed via the Tailwind `ar-*` namespace and the
`--ar-*` CSS variables — never as raw hex in components.

## What's next

Phase 2 builds on this foundation: authentication + organisation onboarding, the
Business Brain setup flow, the main dashboard and AI Employee workspace, the
campaign wizard, and the first live advertising-channel integration. See
`docs/ARCHITECTURE.md` for the roadmap and design decisions.
