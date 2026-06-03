import { parseHandoff } from "./parse.js";
import {
  HANDOFF_STATUSES,
  REQUIRED_FRONTMATTER_KEYS,
  REQUIRED_SECTIONS,
  type HandoffStatus,
  type ValidationIssue,
  type ValidationResult,
} from "./schema.js";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export interface ValidateOptions {
  /**
   * Warn when an in-flight handoff's `created_at` is older than this many
   * days. Default `7`. Pass `0` to disable the check.
   */
  staleAfterDays?: number;
  /**
   * Reference time for staleness checks. Defaults to `new Date()`. Inject
   * a fixed value in tests for determinism.
   */
  now?: Date;
}

export function validate(
  raw: string,
  options: ValidateOptions = {},
): ValidationResult {
  const staleAfterDays = options.staleAfterDays ?? 7;
  const now = options.now ?? new Date();
  const issues: ValidationIssue[] = [];
  let doc;
  try {
    doc = parseHandoff(raw);
  } catch (err) {
    issues.push({
      level: "error",
      message: `failed to parse: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { ok: false, issues };
  }

  const fm = doc.rawFrontmatter;

  for (const key of REQUIRED_FRONTMATTER_KEYS) {
    if (!fm[key] || String(fm[key]).trim() === "") {
      issues.push({
        level: "error",
        field: key,
        message: `frontmatter field "${key}" is required`,
      });
    }
  }

  const status = fm["status"];
  if (
    status !== undefined &&
    !HANDOFF_STATUSES.includes(status as HandoffStatus)
  ) {
    issues.push({
      level: "error",
      field: "status",
      message: `status must be one of: ${HANDOFF_STATUSES.join(", ")} (got "${status}")`,
    });
  }

  const createdAt = fm["created_at"];
  // js-yaml (via gray-matter) parses ISO-8601 timestamps into Date objects,
  // so we accept either form here.
  let createdAtDate: Date | null = null;
  let createdAtDisplay = "";
  if (createdAt instanceof Date) {
    createdAtDate = createdAt;
    createdAtDisplay = createdAt.toISOString();
  } else if (typeof createdAt === "string") {
    createdAtDisplay = createdAt;
    if (!ISO_DATE_RE.test(createdAt)) {
      issues.push({
        level: "warning",
        field: "created_at",
        message: `created_at "${createdAt}" is not an ISO-8601 timestamp`,
      });
    } else {
      const parsed = new Date(createdAt);
      if (!Number.isNaN(parsed.getTime())) createdAtDate = parsed;
    }
  }
  if (createdAtDate) {
    const ageMs = now.getTime() - createdAtDate.getTime();
    const ageDays = ageMs / 86_400_000;
    if (ageDays < -1) {
      issues.push({
        level: "warning",
        field: "created_at",
        message: `created_at "${createdAtDisplay}" is in the future (clock skew?)`,
      });
    } else if (
      staleAfterDays > 0 &&
      ageDays > staleAfterDays &&
      status !== "done"
    ) {
      const days = Math.floor(ageDays);
      issues.push({
        level: "warning",
        field: "created_at",
        message: `handoff is ${days} days old (status: ${
          typeof status === "string" ? status : "unknown"
        }) — older than --stale-after ${staleAfterDays}. Reuse may be unsafe; consider regenerating before acting on it.`,
      });
    }
  }

  const sectionsRecord = doc.sections as unknown as Record<string, string>;
  for (const section of REQUIRED_SECTIONS) {
    const body = sectionsRecord[section];
    if (!body || body.trim() === "") {
      issues.push({
        level: "error",
        field: section,
        message: `section "## ${section}" is required and must not be empty`,
      });
    }
  }

  if (Object.keys(doc.sections.extra).length > 0) {
    for (const heading of Object.keys(doc.sections.extra)) {
      issues.push({
        level: "warning",
        field: heading,
        message: `unknown section "## ${heading}" — not part of the standard schema`,
      });
    }
  }

  const errors = issues.filter((i) => i.level === "error");
  return { ok: errors.length === 0, issues };
}
