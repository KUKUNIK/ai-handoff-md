import matter from "gray-matter";
import {
  ALL_KNOWN_SECTIONS,
  type HandoffDocument,
  type HandoffSections,
} from "./schema.js";

const H2_RE = /^##\s+(.+?)\s*$/;

export function parseHandoff(raw: string): HandoffDocument {
  const parsed = matter(raw);
  const fmRaw = parsed.data as Record<string, unknown>;
  const lines = parsed.content.split("\n");

  const sections: Record<string, string[]> = {};
  let current: string | null = null;

  for (const line of lines) {
    const match = line.match(H2_RE);
    if (match && match[1]) {
      current = match[1].trim();
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (current) {
      sections[current]?.push(line);
    }
  }

  const cleanedSections: HandoffSections = {
    Context: "",
    "What was done": "",
    "What's next": "",
    extra: {},
  };
  const cleanedAsRecord = cleanedSections as unknown as Record<string, string>;
  for (const [heading, body] of Object.entries(sections)) {
    const text = body.join("\n").trim();
    if ((ALL_KNOWN_SECTIONS as readonly string[]).includes(heading)) {
      cleanedAsRecord[heading] = text;
    } else {
      cleanedSections.extra[heading] = text;
    }
  }

  return {
    frontmatter: fmRaw as unknown as HandoffDocument["frontmatter"],
    sections: cleanedSections,
    rawFrontmatter: fmRaw,
  };
}
