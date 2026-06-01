import matter from "gray-matter";
import { parseHandoff } from "./parse.js";
import type { HandoffDocument } from "./schema.js";

export function renderMarkdown(doc: HandoffDocument): string {
  const frontmatter = doc.rawFrontmatter;
  const lines: string[] = [];

  lines.push("## Context");
  lines.push("");
  lines.push(doc.sections.Context.trim() || "_(missing)_");
  lines.push("");
  lines.push("## What was done");
  lines.push("");
  lines.push(doc.sections["What was done"].trim() || "_(missing)_");
  lines.push("");
  lines.push("## What's next");
  lines.push("");
  lines.push(doc.sections["What's next"].trim() || "_(missing)_");
  lines.push("");
  if (doc.sections.Blockers) {
    lines.push("## Blockers");
    lines.push("");
    lines.push(doc.sections.Blockers.trim());
    lines.push("");
  }
  if (doc.sections["Open questions"]) {
    lines.push("## Open questions");
    lines.push("");
    lines.push(doc.sections["Open questions"].trim());
    lines.push("");
  }
  if (doc.sections.Artifacts) {
    lines.push("## Artifacts");
    lines.push("");
    lines.push(doc.sections.Artifacts.trim());
    lines.push("");
  }
  for (const [heading, body] of Object.entries(doc.sections.extra)) {
    lines.push(`## ${heading}`);
    lines.push("");
    lines.push(body.trim());
    lines.push("");
  }

  return matter.stringify(`${lines.join("\n").trimEnd()}\n`, frontmatter);
}

export function renderPrompt(doc: HandoffDocument): string {
  const fm = doc.rawFrontmatter as Record<string, unknown>;
  const lines: string[] = [];
  lines.push(
    `You are continuing a session handed off from "${fm.from_agent}" to "${fm.to_agent}".`,
  );
  lines.push(`Project: ${fm.project}`);
  if (fm.repo) lines.push(`Repo: ${fm.repo}`);
  if (fm.branch) lines.push(`Branch: ${fm.branch}`);
  if (fm.task) lines.push(`Task: ${fm.task}`);
  lines.push(`Status: ${fm.status}`);
  lines.push("");
  lines.push("Use the following handoff as ground truth. Do not invent context not described here.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("### Context");
  lines.push("");
  lines.push(doc.sections.Context.trim());
  lines.push("");
  lines.push("### What was done");
  lines.push("");
  lines.push(doc.sections["What was done"].trim());
  lines.push("");
  lines.push("### What's next");
  lines.push("");
  lines.push(doc.sections["What's next"].trim());
  if (doc.sections.Blockers) {
    lines.push("");
    lines.push("### Blockers");
    lines.push("");
    lines.push(doc.sections.Blockers.trim());
  }
  if (doc.sections["Open questions"]) {
    lines.push("");
    lines.push("### Open questions");
    lines.push("");
    lines.push(doc.sections["Open questions"].trim());
  }
  if (doc.sections.Artifacts) {
    lines.push("");
    lines.push("### Artifacts");
    lines.push("");
    lines.push(doc.sections.Artifacts.trim());
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "Begin by acknowledging the handoff in one sentence, then continue from the \"What's next\" list. Surface any ambiguity before acting.",
  );
  return lines.join("\n") + "\n";
}

export function renderFromMarkdown(raw: string): {
  markdown: string;
  prompt: string;
} {
  const doc = parseHandoff(raw);
  return { markdown: renderMarkdown(doc), prompt: renderPrompt(doc) };
}
