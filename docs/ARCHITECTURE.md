# AdsRobotic — Architecture

This document records the system design and the decisions behind the MVP V1
foundation. It maps directly to the master specification.

## 1. Product shape

AdsRobotic is positioned as an **Autonomous AI Advertising Employee**, not an ad
dashboard. The intelligence is organised as **five engines** (spec §1–§5):

| Engine | Package / surface | Responsibility |
| --- | --- | --- |
| Business Brain | `Business`, `BusinessProfile`, `BusinessMemory` + `ai` agent `business_brain` | Persistent, maturing intelligence about the business & customers |
| Campaign Strategist | `Campaign.strategy` + `ai` agent `strategist` | Goal → executable strategy |
| Creative Factory | `Creative`, `CreativeAsset` + `ai` agent `creative` | Copy / visual / video, with A/B/C/D angles |
| Budget Guardian | `BudgetRule`, `AdWallet`, `WalletTransaction` + agent `budget_guardian` | Protects spend within guardrails |
| Outcome Intelligence | `Lead`, `Conversion`, `Sale`, `CampaignMetric` + agent `performance_analyst` | Models the full funnel, estimated vs actual |

## 2. Monorepo & tooling

pnpm workspaces + Turborepo, mirroring a proven blueprint. Strict TypeScript
(`tsconfig.base.json`), ESLint 9 flat config, Prettier. Every package exposes
`lint` / `typecheck` / `test` so `turbo run <task>` fans out across the graph.

## 3. Design system (spec §9–§10)

`packages/config/src/tokens.ts` is the single source of truth for colour,
typography, and radii. Consumers use:

- Tailwind `ar-*` classes (via the shared preset), and
- `--ar-*` CSS variables (mirrored in `packages/ui/src/styles.css` and the web
  app's `globals.css`).

Colour discipline: **blue dominant**, **cyan = AI activity** (sparingly),
**orange = growth/action CTA** (rarely). The abstract **network signature**
(`NetworkSignature`) is the brand motif — deliberately not a cartoon robot.

## 4. Multi-tenancy (spec §19)

```
Organization (business | agency)
  └── Membership (User × role [× businessId])
  └── Business  (the working unit)
        └── campaigns, creatives, leads, budget rules, memory, wallet, …
```

- `Organization` is the top tenant; agencies are organisations that own multiple
  client `Business` records.
- Business-scoped records carry `businessId`; org-scoped records carry
  `organizationId`. Application code always scopes queries by these.
- Postgres **row-level security** policies are layered on in a later migration;
  the schema is already shaped for it (every tenant row is reachable by a single
  scoping id).
- `AuditLog` is the system of record for "who did what" (spec §21), which is why
  actor references elsewhere are indexed scalars rather than enforced FKs.

## 5. Provider abstractions

Two seams keep vendors replaceable (spec §4, §18, execution step 10):

- **AI** (`packages/ai`): `AIProvider.generate(AIRequest) → AIResult`. Default
  `LocalProvider` is deterministic, makes no external calls, and never fabricates
  data. Claude / OpenAI-compatible adapters drop in behind `createAIProvider`.
  Seven named agents share the one provider.
- **Channels** (`packages/channels/core`): `AdvertisingChannel` implements
  connect / create / update / pause / resume / upload / metrics. A runtime
  `registry` resolves adapters by id. The MVP ships only `MockChannel`; Google,
  Meta, etc. are added as sibling packages without touching callers.

**Reliability rule (spec §27):** every mutating channel call returns a typed
`ChannelMutationResult` with a `verified` flag — the app never assumes success.

## 6. Honesty & trust (spec §21, §22, §28)

- `MetricSource` (`estimated` | `actual`) is carried on every metric/conversion
  so the two are never conflated.
- `AIConfidence` (`high` | `moderate` | `early_signal` | `more_data_needed`) is
  attached to recommendations and AI output — no false certainty.
- `AIActivity` records every significant AI action (with `moneyProtected` and
  `reversible`), powering the "Why did the AI do this?" surface.
- The `AdWallet` ledger (funded / ad spend / service fee / reserved) makes all
  financial movement transparent; platform fees are never hidden.

## 7. Roadmap

- **V1 (this build):** foundation — monorepo, design system, schema, provider
  abstractions, marketing site + free Growth Score.
- **V2:** auth + org onboarding, Business Brain setup, dashboard, AI Employee
  workspace, campaign wizard, first live channel, Smart Pages, WhatsApp leads.
- **V3:** autonomous employee, predictive intelligence, sales attribution, agency
  platform.
- **V4:** AdsRobotic Publisher Network (`Publisher`, `AdInventory` are stubbed in
  the schema already).
