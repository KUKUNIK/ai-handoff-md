export const HANDOFF_STATUSES = [
  "in_progress",
  "blocked",
  "ready_for_review",
  "done",
] as const;
export type HandoffStatus = (typeof HANDOFF_STATUSES)[number];

export interface HandoffFrontmatter {
  handoff_id: string;
  from_agent: string;
  to_agent: string;
  created_at: string;
  project: string;
  status: HandoffStatus;
  repo?: string;
  branch?: string;
  task?: string;
  tags?: string[];
}

export const REQUIRED_FRONTMATTER_KEYS = [
  "handoff_id",
  "from_agent",
  "to_agent",
  "created_at",
  "project",
  "status",
] as const;

export const REQUIRED_SECTIONS = [
  "Context",
  "What was done",
  "What's next",
] as const;

export const OPTIONAL_SECTIONS = [
  "Blockers",
  "Open questions",
  "Artifacts",
] as const;

export const ALL_KNOWN_SECTIONS = [...REQUIRED_SECTIONS, ...OPTIONAL_SECTIONS];

export interface HandoffSections {
  Context: string;
  "What was done": string;
  "What's next": string;
  Blockers?: string;
  "Open questions"?: string;
  Artifacts?: string;
  extra: Record<string, string>;
}

export interface HandoffDocument {
  frontmatter: HandoffFrontmatter;
  sections: HandoffSections;
  rawFrontmatter: Record<string, unknown>;
}

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
  field?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}
