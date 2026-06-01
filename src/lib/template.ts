import matter from "gray-matter";

export interface TemplateInput {
  handoffId?: string;
  fromAgent: string;
  toAgent: string;
  project: string;
  task?: string;
  repo?: string;
  branch?: string;
  status?: "in_progress" | "blocked" | "ready_for_review" | "done";
  now?: Date;
}

export function makeTemplate(input: TemplateInput): string {
  const now = input.now ?? new Date();
  const id = input.handoffId ?? defaultHandoffId(input.project, now);
  const frontmatter: Record<string, unknown> = {
    handoff_id: id,
    from_agent: input.fromAgent,
    to_agent: input.toAgent,
    project: input.project,
    status: input.status ?? "in_progress",
    created_at: now.toISOString(),
  };
  if (input.task) frontmatter.task = input.task;
  if (input.repo) frontmatter.repo = input.repo;
  if (input.branch) frontmatter.branch = input.branch;

  const body = `
## Context

<!-- What is this session about? What problem are we solving? -->

## What was done

<!-- List the concrete progress made. Be specific: filenames, decisions, results. -->
- [ ] item 1

## What's next

<!-- The next concrete steps for the receiving agent. -->
1. step 1

## Blockers

<!-- Optional: anything blocking progress that the receiving agent needs to know. -->

## Open questions

<!-- Optional: questions for the receiving agent or for the human. -->

## Artifacts

<!-- Optional: files, links, commit hashes, PRs, logs. -->
`.trim();

  return matter.stringify(`${body}\n`, frontmatter);
}

function defaultHandoffId(project: string, now: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const stamp =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
  return `${project}-${stamp}`;
}
