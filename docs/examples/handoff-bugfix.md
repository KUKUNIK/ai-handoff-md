---
handoff_id: ho_2026_06_05_billing_idempotency
from_agent: claude-code
to_agent: codex
created_at: 2026-06-05T10:14:32Z
project: billing-api
status: in_progress
repo: example-org/billing-api
branch: fix/checkout-idempotency-2026-06
task: Fix duplicate-charge bug in /api/checkout on burst retries
---

## Context

Customers occasionally see two charges from a single checkout submit.
Sentry trace `BILL-9128` shows the same `intent_id` hitting
`/api/checkout` twice within 800ms when the client retries on a 504.

## What was done

- Reproduced locally with a 504-injecting proxy. Confirmed two
  `charges.created` rows for one intent_id
  (`apps/billing/api/test/repro_BILL-9128.test.ts`).
- Added an `idempotency_key` column to `charges` (migration
  `0042_charges_idempotency.sql`). Backfill is a no-op for prod
  because the column is nullable.
- Wired up `req.headers['idempotency-key']` → insert ON CONFLICT
  DO NOTHING in `apps/billing/api/src/routes/checkout.ts:84-112`.

## What's next

- Frontend (`apps/web/src/checkout/submit.ts`) does not yet send the
  header. The retry loop generates a UUID per submit; reuse it across
  retries.
- Decide on header naming convention. Stripe uses `Idempotency-Key`;
  we already accept that case, but agreeing on the canonical
  capitalization in our internal docs would help.
- Add an e2e test that hammers the endpoint with the 504 injector and
  asserts exactly one charge row.

## Artifacts

```bash
cd apps/billing/api
pnpm test repro_BILL-9128
pnpm migrate:dev    # applies 0042 against the local stack
curl -X POST localhost:4001/api/checkout \
  -H 'Idempotency-Key: test-1' \
  -d '{"intent_id":"int_demo","amount":100}'
# Repeat the same curl — second call should return the SAME response,
# and `select count(*) from charges where intent_id='int_demo'`
# should be 1.
```

Gotchas:

- Migration 0042 is **safe to apply mid-flight** (nullable column, no
  default). Do NOT add a NOT NULL constraint in a follow-up without a
  staged backfill — production has ~14M historical rows.
- The 504 injector lives in `tools/proxy-504.mjs`. It only runs in
  dev (gates on `NODE_ENV !== 'production'`); don't ship it.
