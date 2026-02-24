# Decision Log

## 2026-02-24 - Phase 1 implementation baseline
- Chose Prisma with PostgreSQL for schema, constraints, and seed ergonomics.
- Kept API in NestJS with simple modules and explicit tenant/store fields for all primary entities.
- Implemented offline sync as event push/pull with idempotency key uniqueness.
- For web offline: used Dexie outbox + cached products/stock snapshots, and explicit manual sync.
