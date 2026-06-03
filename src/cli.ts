import { readFile, writeFile } from "node:fs/promises";
import { Command } from "commander";
import kleur from "kleur";
import { parseHandoff } from "./lib/parse.js";
import { renderMarkdown, renderPrompt } from "./lib/render.js";
import { makeTemplate } from "./lib/template.js";
import { validate } from "./lib/validate.js";

const VERSION = "0.2.0";

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("handoff")
    .description("Validate and render AI session handoff markdown.")
    .version(VERSION);

  program
    .command("init")
    .description("emit a new handoff markdown template")
    .requiredOption("--project <name>")
    .requiredOption("--from <agent>", "from_agent (e.g. claude code, gpt, codex)")
    .requiredOption("--to <agent>", "to_agent")
    .option("--task <text>", "task description")
    .option("--repo <url-or-name>", "repo identifier")
    .option("--branch <name>", "branch name")
    .option("--status <s>", "in_progress | blocked | ready_for_review | done", "in_progress")
    .option("--out <path>", "write to file instead of stdout")
    .action(
      async (opts: {
        project: string;
        from: string;
        to: string;
        task?: string;
        repo?: string;
        branch?: string;
        status?: string;
        out?: string;
      }) => {
        const allowed = ["in_progress", "blocked", "ready_for_review", "done"];
        if (opts.status && !allowed.includes(opts.status)) {
          fatal(`bad --status: ${opts.status}`);
          return;
        }
        const md = makeTemplate({
          project: opts.project,
          fromAgent: opts.from,
          toAgent: opts.to,
          task: opts.task,
          repo: opts.repo,
          branch: opts.branch,
          status: opts.status as
            | "in_progress"
            | "blocked"
            | "ready_for_review"
            | "done",
        });
        if (opts.out) {
          await writeFile(opts.out, md, "utf8");
          process.stdout.write(`wrote ${opts.out}\n`);
        } else {
          process.stdout.write(md);
        }
      },
    );

  program
    .command("validate <path>")
    .description("validate a handoff file against the schema")
    .option("--no-color", "disable colors")
    .option(
      "--stale-after <days>",
      "warn when an in-flight handoff is older than N days (0 disables)",
      "7",
    )
    .action(
      async (
        path: string,
        opts: { color: boolean; staleAfter: string },
      ) => {
      const raw = await readFile(path, "utf8");
      const staleAfterDays = Number.parseInt(opts.staleAfter, 10);
      if (Number.isNaN(staleAfterDays) || staleAfterDays < 0) {
        fatal(`bad --stale-after: ${opts.staleAfter} (expected a non-negative integer)`);
        return;
      }
      const result = validate(raw, { staleAfterDays });
      const useColor = opts.color !== false && Boolean(process.stdout.isTTY);
      const c = (fn: (s: string) => string, s: string) =>
        useColor ? fn(s) : s;
      for (const issue of result.issues) {
        const tag =
          issue.level === "error"
            ? c((s) => kleur.red().bold(s), "error")
            : c((s) => kleur.yellow().bold(s), "warning");
        const field = issue.field ? c((s) => kleur.gray(s), `[${issue.field}] `) : "";
        process.stdout.write(`${tag}: ${field}${issue.message}\n`);
      }
      if (result.ok) {
        process.stdout.write(c((s) => kleur.green(s), "ok\n"));
        process.exitCode = 0;
      } else {
        process.exitCode = 1;
      }
    });

  program
    .command("render <path>")
    .description("render a handoff file as a prompt or normalized markdown")
    .option("--format <fmt>", "prompt | markdown", "prompt")
    .action(async (path: string, opts: { format: string }) => {
      const raw = await readFile(path, "utf8");
      const doc = parseHandoff(raw);
      if (opts.format === "markdown") {
        process.stdout.write(renderMarkdown(doc));
      } else {
        process.stdout.write(renderPrompt(doc));
      }
    });

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    fatal(err instanceof Error ? err.message : String(err));
  }
}

function fatal(message: string): void {
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 2;
}

main();
