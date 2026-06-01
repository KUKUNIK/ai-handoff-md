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

export function validate(raw: string): ValidationResult {
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
  if (typeof createdAt === "string" && !ISO_DATE_RE.test(createdAt)) {
    issues.push({
      level: "warning",
      field: "created_at",
      message: `created_at "${createdAt}" is not an ISO-8601 timestamp`,
    });
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
