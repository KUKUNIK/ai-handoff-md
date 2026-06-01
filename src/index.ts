export { parseHandoff } from "./lib/parse.js";
export { validate } from "./lib/validate.js";
export { renderMarkdown, renderPrompt, renderFromMarkdown } from "./lib/render.js";
export { makeTemplate } from "./lib/template.js";
export type { TemplateInput } from "./lib/template.js";
export {
  ALL_KNOWN_SECTIONS,
  HANDOFF_STATUSES,
  OPTIONAL_SECTIONS,
  REQUIRED_FRONTMATTER_KEYS,
  REQUIRED_SECTIONS,
} from "./lib/schema.js";
export type {
  HandoffDocument,
  HandoffFrontmatter,
  HandoffSections,
  HandoffStatus,
  ValidationIssue,
  ValidationResult,
} from "./lib/schema.js";
