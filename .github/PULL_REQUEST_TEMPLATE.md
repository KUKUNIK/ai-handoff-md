<!-- Short PR description — what changes and why. -->

## What

## Why

## Verification

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] If the schema (`src/lib/schema.ts`) changed, `docs/examples/`
      handoffs still validate (`node dist/cli.js validate
      docs/examples/handoff-bugfix.md --stale-after 0`)
- [ ] If a CLI flag or library type changed, README.md and
      CHANGELOG.md were updated

## Notes for reviewer

<!-- Anything to eyeball: schema additions, validator level changes,
     stale-after edge cases, etc. -->
