# CarbonPulse

A full-stack precision carbon intelligence platform — users log daily activities (transport, food, energy, shopping, waste), get IPCC AR6-accurate CO₂ calculations, AI-generated insights, and community comparisons.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter (routing), Recharts, Framer Motion, shadcn/ui, @tanstack/react-query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/db/src/schema/index.ts` — all Drizzle table schemas
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/services/carbonCalc.service.ts` — IPCC AR6 emission factors + CO₂ calculation
- `artifacts/api-server/src/services/gemini.service.ts` — Gemini AI insight generation
- `artifacts/carbonpulse/src/pages/` — React page components
- `artifacts/carbonpulse/src/components/` — shared components (layout, form)

## Architecture decisions

- No auth — demo user `demo-user` is hardcoded client-side via `x-user-id` header; GET /users/me auto-creates on first visit
- Emission factors in grams per kg (food) or grams per km (transport) — IPCC AR6 2023
- One AI insight per week (upserts if regenerated); graceful fallback if Gemini key unavailable
- `req.query` is read-only getter in Express 5 — validate middleware must not mutate it (only body/params)
- Recharts `ResponsiveContainer` requires explicit `height={N}` (not `height="100%"`) when the parent container uses Tailwind `h-[Npx]` classes

## Product

- **Dashboard** — "Mission Control": live pulse metrics (today/week CO₂), budget progress bar, 30-day area chart, donut category breakdown, recent activities
- **Log Activity** — category selector (transport/food/energy/shopping/waste), route preview for transport
- **AI Insights** — Gemini-powered weekly analysis with drivers, suggested actions, and projected annual savings
- **Goals** — Set weekly CO₂ targets and track progress
- **Community** — User percentile vs. regional/global averages
- **Settings** — Display name, weekly budget slider, light/dark/system theme toggle

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `req.query` read-only in Express 5 — see validate middleware fix
- Recharts chart heights must be explicit pixels on `ResponsiveContainer`, not CSS classes
- Food emission factors are per kg, not per serving — quantity=1 means 1 kg
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI changes before touching frontend

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
