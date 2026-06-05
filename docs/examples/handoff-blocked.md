---
handoff_id: ho_2026_06_05_jwt_auth_phase2
from_agent: codex
to_agent: claude-code
created_at: 2026-06-05T11:02:00Z
project: api-gateway
status: blocked
repo: example-org/api-gateway
branch: feat/jwt-auth-migration
task: Migrate auth from legacy session cookies to JWT bearer tokens
---

## Context

Phase 1 of the auth migration — issuing JWTs in parallel with the
legacy session cookie — is merged. Phase 2 (verifying JWTs and
deprecating the cookie) is blocked on a decision we need from the
infra team about token rotation.

## What was done

- Implemented `apps/auth/src/lib/jwt.ts` (HS256, 1h access / 30d
  refresh) with 100% coverage in `apps/auth/test/jwt.test.ts`.
- Behind `feature_flags.jwt_dual_write`, `/login` now sets both the
  legacy cookie AND returns `access_token` / `refresh_token` in the
  body. Flag is enabled in staging, off in prod.
- Updated SDK docs in `docs/sdk/auth.md` to describe the new fields.

## What's next

The Phase 2 PR (`feat/jwt-verify-and-deprecate`) sits in a draft
state pending the rotation decision below. Once decided:

1. Implement the chosen approach behind `feature_flags.jwt_verify`.
2. Flip dual-write users to JWT-only in staging for one week.
3. Roll the flag in prod ring-by-ring (1% → 10% → 100%).

## Blockers

We have not decided **how often to rotate the HS256 signing secret**.
The infra team's auth runbook says "quarterly" for HMAC secrets, but
the planned 24h grace window (overlap between old and new secret)
does not fit the 30d refresh-token TTL.

## Open questions

Pick one:

1. **Lengthen rotation grace to 30d.** Trivial config change; cost
   is that a leaked secret is exploitable for a month.
2. **Shorten refresh TTL to 24h.** Forces re-login daily for every
   user — UX regression.
3. **Move refresh tokens to a DB-backed allowlist** so rotation
   doesn't invalidate them. Adds a DB lookup to every refresh.

A sketch of option 3 is in `apps/auth/notes/refresh-allowlist.md` but
it is not implemented.

## Artifacts

```bash
cd apps/auth
pnpm test                              # 47 tests, all passing
pnpm dev                                # starts auth on :4002
curl -X POST :4002/login -d '{...}'    # both access_token + cookie set
```

Gotchas:

- The legacy session cookie is still the source of truth in prod.
  Verifier code in Phase 2 must NOT trust the JWT until the flag flip.
- `apps/auth/src/lib/jwt.ts:HS_SECRET` reads from `AUTH_HS_SECRET`.
  The staging value rotates manually; there is no rotation automation
  yet, which is the whole point of the decision above.
