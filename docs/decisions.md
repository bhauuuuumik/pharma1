# Decision Log

## 2026-02-24 - Phase 1 implementation baseline
- Chose Prisma with PostgreSQL for schema, constraints, and seed ergonomics.
- Kept API in NestJS with simple modules and explicit tenant/store fields for all primary entities.
- Implemented offline sync as event push/pull with idempotency key uniqueness.
- For web offline: used Dexie outbox + cached products/stock snapshots, and explicit manual sync.

## 2026-02-24 - Phase 2 ledger and purchase foundation
- Added Supplier and PurchaseInvoice/PurchaseLineItem models to keep purchase entry explicit and auditable.
- Purchase posting now creates/updates batches and appends `PURCHASE` entries to StockLedger.
- Sales now enforce FEFO batch resolution when a batch is not provided and reject insufficient stock.
- Sales returns default to the sold batch to preserve ledger correctness.


## 2026-02-24 - Phase 3 scan pipeline baseline
- Added a scan pipeline with explicit review state before posting to stock to keep human-in-loop control.
- LLM extraction uses strict JSON schema + zod validation with heuristic fallback when API key/network is unavailable.
- Confidence threshold is 0.8 for low-confidence highlighting in review UI.
