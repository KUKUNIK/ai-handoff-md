# ai-handoff-md

[![CI](https://github.com/KUKUNIK/ai-handoff-md/actions/workflows/ci.yml/badge.svg)](https://github.com/KUKUNIK/ai-handoff-md/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ai-handoff-md.svg)](https://www.npmjs.com/package/ai-handoff-md)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

A tiny markdown convention — and a CLI validator — for handing off work between AI coding sessions. Same agent, different session. Different agents (Claude → GPT, GPT → Codex). Or you handing off to yourself tomorrow.

A handoff file is just a markdown document with required frontmatter and three required sections. That's the whole spec.

> Status: `0.2.0` — schema may shift before `1.0`.

## Why a "handoff" file?

Every time you start a new AI coding session, you waste 5–10 minutes re-establishing context: what were we working on, what's done, what's stuck. If you're switching tools (Claude Code → ChatGPT for a research dive → back to Codex), the cost compounds.

A handoff file fixes one part of that: at the end of a session, the agent writes down what it'd want a future self / future agent to know. Next session loads it.

This package gives you:

1. **A schema.** A small one — six frontmatter fields, three required sections, three optional sections. That's it.
2. **A CLI validator.** `handoff validate path.md` fails fast if a section is missing or a field is wrong, and warns when a handoff is suspiciously old (the kind of foot-gun where you re-paste a week-old `handoff.md` without realising the branch has moved on).
3. **A prompt renderer.** `handoff render path.md` outputs a prompt prefix you can paste into any agent.
4. **A template generator.** `handoff init` to skip the blank-page problem.

## Install

```bash
npm install -g ai-handoff-md
# or
pnpm add -g ai-handoff-md
```

Requires Node 18+.

## The schema

### Frontmatter (YAML)

| field | required | example |
| --- | --- | --- |
| `handoff_id` | yes | `my-app-20260601-1330` |
| `from_agent` | yes | `claude code`, `gpt`, `codex`, `dohyun` |
| `to_agent` | yes | `gpt` |
| `project` | yes | `my-app` |
| `status` | yes | `in_progress` \| `blocked` \| `ready_for_review` \| `done` |
| `created_at` | yes | `2026-06-01T13:30:00Z` (ISO-8601) |
| `repo` | no | `github.com/me/my-app` |
| `branch` | no | `feat/auth-redirect-fix` |
| `task` | no | `investigate /dashboard redirect loop` |
| `tags` | no | `[auth, regression]` |

### Sections (markdown H2)

Required:

- `## Context` — why this session exists; the problem we're solving.
- `## What was done` — concrete progress: filenames, decisions, results.
- `## What's next` — concrete next steps for the receiving agent.

Optional:

- `## Blockers` — things blocking progress.
- `## Open questions` — questions for the receiving agent or the human.
- `## Artifacts` — files, links, commit hashes, PRs, logs.

Sections outside this list are allowed, but `validate` will warn about them — they tend to be noise that drifts across sessions.

See [`examples/sample-handoff.md`](./examples/sample-handoff.md) for a full example.

## CLI

```bash
# Generate a starter template
handoff init \
  --project my-app \
  --from "claude code" \
  --to gpt \
  --task "fix auth redirect" \
  --out handoff.md

# Validate it
handoff validate handoff.md

# Turn it into a prompt for the next agent
handoff render handoff.md > prompt.md
pbcopy < prompt.md   # macOS

# Or normalize the markdown (re-emit with standard section order)
handoff render handoff.md --format markdown > handoff.normalized.md
```

Exit codes for `validate`:

- `0` — valid (possibly with warnings).
- `1` — has at least one error, **or** in `--strict` mode at least one
  warning.
- `2` — couldn't read / parse the file.

### Staleness check

`validate` warns when an in-flight handoff is older than 7 days by
default — the kind of mistake where you re-paste a week-old
`handoff.md` into a fresh session without realising the branch has
already moved on. Tune or disable it with `--stale-after`:

```bash
handoff validate handoff.md                  # default: warn after 7 days
handoff validate handoff.md --stale-after 1  # tighter — anything past a day
handoff validate handoff.md --stale-after 0  # disable entirely
```

### Strict mode (CI gate)

`--strict` flips the exit code for warnings too. Use it in CI checks
that should refuse to merge a handoff with *any* complaint — unknown
sections, non-ISO timestamps, stale-after misses, future-dated clock
skew:

```bash
handoff validate handoff.md --strict --stale-after 3
```

Same `issues` array, same level on each issue — only the verdict and
exit code change. Errors still take precedence, so strict cannot mask
a real error and report it as a strict-promoted warning.

Done handoffs (`status: done`) are exempt — an archived handoff being
old is the point. Future-dated `created_at` values also warn (usually
means clock skew between two machines).

## Library

```ts
import { parseHandoff, validate, renderPrompt, makeTemplate } from "ai-handoff-md";

const raw = await readFile("handoff.md", "utf8");

const result = validate(raw);
if (!result.ok) {
  for (const issue of result.issues) console.error(issue);
  process.exit(1);
}

const doc = parseHandoff(raw);
const prompt = renderPrompt(doc);
// → send this string as the first user message to the next agent
```

```ts
import { makeTemplate } from "ai-handoff-md";

const md = makeTemplate({
  project: "my-app",
  fromAgent: "claude code",
  toAgent: "gpt",
  task: "fix auth redirect",
});
```

## Pairs well with

- [md-context-store](https://github.com/KUKUNIK/md-context-store) — store these handoffs alongside chunks/decisions/issues for a single project.
- Any session manager that lets you paste a prompt prefix at the start of a chat (Claude.ai, ChatGPT, Cursor, Codex CLI).

## Design choices

- **Section names are fixed.** `## What was done` not `## Progress` or `## Done`. Renamability invites inconsistency; the cost of memorizing three section titles is tiny.
- **Validation is structural only.** This package doesn't grade the *quality* of your handoff prose — that's the agent's job.
- **No live communication.** A handoff is a file. You paste it. The next agent reads it. There's no daemon, no socket, no syncing service.
- **No hidden context.** Anything the next agent needs has to be in the file. If it's not, that's a content bug, and the agent should ask before assuming.

## License

MIT
