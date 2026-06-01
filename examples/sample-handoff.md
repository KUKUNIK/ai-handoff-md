---
handoff_id: my-app-20260601-1330
from_agent: claude code
to_agent: gpt
project: my-app
status: in_progress
created_at: 2026-06-01T13:30:00Z
repo: github.com/me/my-app
branch: feat/auth-redirect-fix
task: investigate /dashboard redirect loop
---

## Context

User reports an infinite redirect loop on `/dashboard` after login. We narrowed it to middleware in `src/middleware.ts` that re-checks the auth cookie even on the redirect target.

## What was done

- Reproduced locally with a fresh browser profile.
- Added a debug log at `src/middleware.ts:42`. Cookie is present but `parseSession()` returns null on the first request after the OAuth callback.
- Hypothesis: cookie is being set with `SameSite=Lax` but the OAuth callback is a cross-site POST, so the cookie isn't attached to the immediate redirect.

## What's next

1. Confirm `SameSite` value in production by checking `Set-Cookie` headers (Network tab).
2. If confirmed, change `SameSite` to `None; Secure` and re-test.
3. If not the cause, add server-side session lookup to `parseSession()` as a fallback.

## Blockers

- No staging env mirrors production OAuth callback URL — need to test on `preview-*.vercel.app`.

## Open questions

- Should we keep `SameSite=Lax` on non-auth cookies for safety, or normalize everything to `None; Secure`?

## Artifacts

- Failing reproduction: gist.github.com/me/abc123
- Related PR: github.com/me/my-app/pull/482
