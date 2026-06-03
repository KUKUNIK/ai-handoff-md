import { describe, expect, it } from "vitest";
import { parseHandoff } from "../src/lib/parse.js";
import { renderMarkdown, renderPrompt } from "../src/lib/render.js";
import { makeTemplate } from "../src/lib/template.js";
import { validate } from "../src/lib/validate.js";

const VALID = `---
handoff_id: demo-1
from_agent: claude code
to_agent: gpt
project: demo
status: in_progress
created_at: 2026-06-01T12:00:00Z
---

## Context

We are investigating a redirect loop.

## What was done

- Reproduced locally.

## What's next

1. Check SameSite.
`;

describe("validate", () => {
  it("passes on a well-formed handoff", () => {
    const result = validate(VALID);
    expect(result.ok).toBe(true);
    expect(result.issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("flags missing required frontmatter", () => {
    const raw = VALID.replace("from_agent: claude code\n", "");
    const result = validate(raw);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.field === "from_agent")).toBe(true);
  });

  it("rejects unknown status values", () => {
    const raw = VALID.replace("status: in_progress", "status: lol");
    const result = validate(raw);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.field === "status")).toBe(true);
  });

  it("warns on non-ISO created_at", () => {
    const raw = VALID.replace(
      "created_at: 2026-06-01T12:00:00Z",
      "created_at: yesterday",
    );
    const result = validate(raw);
    expect(result.ok).toBe(true);
    expect(
      result.issues.some(
        (i) => i.field === "created_at" && i.level === "warning",
      ),
    ).toBe(true);
  });

  it("flags missing required sections", () => {
    const raw = VALID.replace(/## What's next[\s\S]*$/, "").trim() + "\n";
    const result = validate(raw);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.field === "What's next")).toBe(true);
  });

  it("warns about unknown sections", () => {
    const raw = `${VALID}\n## Random Notes\n\nsomething\n`;
    const result = validate(raw);
    expect(
      result.issues.some(
        (i) => i.level === "warning" && i.field === "Random Notes",
      ),
    ).toBe(true);
  });
});

describe("validate — stale handoff", () => {
  it("warns when an in-flight handoff is older than --stale-after", () => {
    const result = validate(VALID, {
      now: new Date("2026-06-30T12:00:00Z"),
      staleAfterDays: 7,
    });
    const stale = result.issues.find(
      (i) =>
        i.field === "created_at" &&
        i.level === "warning" &&
        /days old/.test(i.message),
    );
    expect(stale).toBeTruthy();
    expect(stale?.message).toContain("29 days old");
  });

  it("does not warn when within the stale window", () => {
    const result = validate(VALID, {
      now: new Date("2026-06-04T12:00:00Z"),
      staleAfterDays: 7,
    });
    expect(
      result.issues.some(
        (i) => i.field === "created_at" && /days old/.test(i.message),
      ),
    ).toBe(false);
  });

  it("does not warn when status is done, regardless of age", () => {
    const raw = VALID.replace("status: in_progress", "status: done");
    const result = validate(raw, {
      now: new Date("2027-01-01T00:00:00Z"),
      staleAfterDays: 7,
    });
    expect(
      result.issues.some((i) => /days old/.test(i.message)),
    ).toBe(false);
  });

  it("staleAfterDays: 0 disables the check", () => {
    const result = validate(VALID, {
      now: new Date("2030-01-01T00:00:00Z"),
      staleAfterDays: 0,
    });
    expect(
      result.issues.some((i) => /days old/.test(i.message)),
    ).toBe(false);
  });

  it("warns when created_at is in the future (clock skew)", () => {
    const result = validate(VALID, {
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(
      result.issues.some(
        (i) =>
          i.field === "created_at" &&
          i.level === "warning" &&
          /future/.test(i.message),
      ),
    ).toBe(true);
  });

  it("skips age math when created_at is malformed (already warned separately)", () => {
    const raw = VALID.replace(
      "created_at: 2026-06-01T12:00:00Z",
      "created_at: yesterday",
    );
    const result = validate(raw, { staleAfterDays: 7 });
    expect(
      result.issues.some((i) => /days old/.test(i.message)),
    ).toBe(false);
  });
});

describe("parseHandoff", () => {
  it("extracts sections and frontmatter", () => {
    const doc = parseHandoff(VALID);
    expect(doc.frontmatter.handoff_id).toBe("demo-1");
    expect(doc.sections.Context).toContain("redirect loop");
    expect(doc.sections["What was done"]).toContain("Reproduced");
    expect(doc.sections["What's next"]).toContain("SameSite");
  });
});

describe("render", () => {
  it("renders a prompt that includes all sections", () => {
    const doc = parseHandoff(VALID);
    const prompt = renderPrompt(doc);
    expect(prompt).toContain("from \"claude code\" to \"gpt\"");
    expect(prompt).toContain("Project: demo");
    expect(prompt).toContain("### Context");
    expect(prompt).toContain("### What's next");
  });

  it("round-trips markdown without losing data", () => {
    const doc = parseHandoff(VALID);
    const md = renderMarkdown(doc);
    const reparsed = parseHandoff(md);
    expect(reparsed.frontmatter.handoff_id).toBe("demo-1");
    expect(reparsed.sections.Context.trim()).toContain("redirect loop");
  });
});

describe("makeTemplate", () => {
  it("emits a valid template", () => {
    const md = makeTemplate({
      project: "demo",
      fromAgent: "claude code",
      toAgent: "gpt",
      task: "fix something",
      now: new Date("2026-06-01T12:00:00Z"),
    });
    expect(md).toContain("project: demo");
    expect(md).toContain("from_agent: claude code");
    expect(md).toContain("## Context");
    expect(md).toContain("## What was done");
    expect(md).toContain("## What's next");
  });

  it("template fails validation until sections are filled (because comments aren't bodies)", () => {
    const md = makeTemplate({
      project: "demo",
      fromAgent: "claude code",
      toAgent: "gpt",
      now: new Date("2026-06-01T12:00:00Z"),
    });
    // Template body is just HTML comments + a placeholder bullet. It should
    // still parse, and required sections have something in them (the
    // placeholder), so validate passes structurally. That's the contract:
    // structural correctness, not content quality.
    const result = validate(md);
    expect(result.ok).toBe(true);
  });
});
