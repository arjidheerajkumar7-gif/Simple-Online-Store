# Little Market

A small online shop for browsing everyday goods, maintaining a shopping bag, and saving demo orders.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Shop API uses Supabase PostgREST via the `SUPER_BASE_URL` and `SERVICE_ROLE_API` Replit Secrets. The service-role key is server-only; the storefront does not use the anon key.
- Run `artifacts/little-market/supabase/setup.sql` in the Supabase SQL Editor to create the catalog and order tables and seed the initial products.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- Product catalog and saved orders are read and written through the API server using Supabase's service-role key; never send that key to the browser.
- Product prices are authoritative in the database and order totals are recalculated in the database function at submission time.
- The shopping bag is stored in the shopper's browser; customer and order details are stored in Supabase after successful checkout.

## Product

Browse and filter the product catalog, save a cart locally, and submit a demo order without taking payment.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
