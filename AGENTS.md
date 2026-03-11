# AGENTS.md

## Scope
These instructions apply to the entire repository.

## Project conventions
- Follow phased delivery: keep each phase shippable.
- Prefer simple, working flows over over-engineering.
- Use strict TypeScript settings for all TS projects.
- Keep APIs tenant/store scoped.

## Monorepo commands
- Install: `pnpm install`
- Dev (all): `pnpm dev`
- Lint: `pnpm -r lint`
- Test: `pnpm -r test`
- Format check: `pnpm -r format:check`

## Quality gates before commit
1. `pnpm -r lint`
2. `pnpm -r test`
3. `pnpm -r typecheck`

## Coding notes
- Use Zod for DTO validation where practical.
- Mutations should accept/use idempotency keys.
- Stock is ledger-driven (append-only events), avoid direct quantity edits.
- Add/update `docs/decisions.md` for notable trade-offs.
