# Pharma1 Monorepo (Phase 0 + Phase 1)

India-first pharmacy software baseline with offline-first POS and sync foundations.

## Monorepo structure
- `apps/web` - React + Vite PWA-ready POS, inventory, and manual purchase entry UI
- `apps/api` - NestJS API with Prisma/PostgreSQL
- `apps/mobile` - Flutter placeholder scaffold notes
- `packages/shared` - shared types/schemas
- `packages/sync` - sync event definitions

## Local run
1. Start infra:
   ```bash
   docker compose up -d
   ```
2. Install deps:
   ```bash
   pnpm install
   ```
3. Generate Prisma client + migrate + seed:
   ```bash
   pnpm --filter @pharma/api prisma:generate
   pnpm --filter @pharma/api prisma:migrate
   pnpm --filter @pharma/api seed
   ```
4. Run apps:
   ```bash
   pnpm dev
   ```
   - API: http://localhost:3000
   - Web: http://localhost:5173

## Environment variables
Copy `.env.example` to `.env` (root and/or `apps/api/.env`) and adjust values.

## Offline sync (brief)
Web app stores outbox events locally in IndexedDB (Dexie). Offline sales are inserted as `SALE_CREATED` events and shown as pending. When online, sync pushes outbox events to `/sync/push` with idempotency keys and pulls server events from `/sync/pull` using cursor for eventual consistency.

## Tests and checks
```bash
pnpm -r lint
pnpm -r typecheck
pnpm -r test
```

## Seed data
`apps/api/prisma/seed.ts` creates:
- default tenant/store/staff
- 500 sample products
- starter batches
for instant POS demo, including a starter supplier.


## Phase 2 additions
- Supplier management API (`/suppliers`)
- Purchase invoice posting API (`/purchases`) that updates batch stock and appends purchase ledger entries
- FEFO-safe sale behavior and same-batch sales return handling
