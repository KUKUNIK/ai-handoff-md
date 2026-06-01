# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-06-01

### Added

- Initial release.
- Schema for AI session handoff markdown:
  - 6 required frontmatter fields: `handoff_id`, `from_agent`, `to_agent`, `project`, `status`, `created_at`.
  - 3 required sections: `## Context`, `## What was done`, `## What's next`.
  - 3 optional sections: `## Blockers`, `## Open questions`, `## Artifacts`.
- `handoff` CLI:
  - `handoff init` — generate a starter handoff file from a small set of flags.
  - `handoff validate <path>` — schema validation with structured errors and warnings.
  - `handoff render <path>` — output as a prompt prefix (default) or normalized markdown.
- Library exports: `parseHandoff`, `validate`, `renderPrompt`, `renderMarkdown`, `makeTemplate`.
- Example handoff file under `examples/sample-handoff.md`.

### Validation rules

- Required frontmatter fields must be present and non-empty.
- `status` must be one of `in_progress | blocked | ready_for_review | done`.
- `created_at` is warned (not errored) on non-ISO-8601 values.
- Required sections must exist and have non-empty bodies.
- Unknown sections produce a warning, not an error.
