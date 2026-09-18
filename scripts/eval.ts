import { readFileSync, writeFileSync } from "node:fs";
import { load as parseYaml } from "js-yaml";
import { getAnthropicClient } from "../lib/agent/client";
import { MODELS } from "../lib/config";
import { runAgentTurn, type AgentClient } from "../lib/agent/loop";
import { runAllChecks } from "../lib/evals/checks";
import { EvalCasesFileSchema, MUST_PASS_CATEGORIES, MUST_PASS_BAR, OVERALL_PASS_BAR, type EvalCase } from "../lib/evals/schema";

interface CaseResult {
  case: EvalCase;
  pass: boolean;
  replyText: string;
  toolCalls: { name: string; input: unknown }[];
  failures: string[];
  toneScore?: number;
}

async function playCase(client: AgentClient, testCase: EvalCase): Promise<CaseResult> {
  let history: Parameters<typeof runAgentTurn>[0] = [];
  let last: Awaited<ReturnType<typeof runAgentTurn>> | undefined;
  for (const turn of testCase.turns) {
    last = await runAgentTurn(history, turn, { client });
    history = last.history;
  }
  const replyText = last!.replyText;
  const toolCalls = last!.toolCalls;
  const { pass, results } = runAllChecks(testCase.checks, { replyText, toolCalls });
  const failures = results.filter((r) => !r.pass).map((r) => r.reason ?? `${r.check.type} failed`);
  return { case: testCase, pass, replyText, toolCalls: toolCalls.map((t) => ({ name: t.name, input: t.input })), failures };
}

// Best-effort tone/clarity rating (SPEC §9: "use a Haiku rubric only for
// tone and clarity"). Never affects pass/fail — deterministic checks are
// the actual gate — and any failure here is swallowed so a flaky rubric
// call can't sink the whole run.
async function rateTone(client: AgentClient, replyText: string): Promise<number | undefined> {
  try {
    const response = await client.messages.create({
      model: MODELS.cheap,
      max_tokens: 8,
      system:
        "Rate the tone and clarity of this Bengali reply for a rural first-time farmer, on a 1-5 scale (5 = warm, simple, clear; 1 = confusing or cold). Reply with only the digit.",
      messages: [{ role: "user", content: replyText }],
    });
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const score = Number(text.trim().match(/[1-5]/)?.[0]);
    return Number.isFinite(score) ? score : undefined;
  } catch {
    return undefined;
  }
}

function loadPreviousReport(): Record<string, boolean> {
  try {
    return JSON.parse(readFileSync("evals/.last-run.json", "utf8"));
  } catch {
    return {};
  }
}

function renderReport(results: CaseResult[], previous: Record<string, boolean>): string {
  const byCategory = new Map<string, CaseResult[]>();
  for (const r of results) {
    if (!byCategory.has(r.case.category)) byCategory.set(r.case.category, []);
    byCategory.get(r.case.category)!.push(r);
  }

  const lines: string[] = [`# Eval report — ${new Date().toISOString()}`, ""];
  lines.push("| Category | Pass rate | Must-pass? |", "|---|---|---|");
  for (const [category, rows] of byCategory) {
    const passRate = rows.filter((r) => r.pass).length / rows.length;
    const mustPass = (MUST_PASS_CATEGORIES as readonly string[]).includes(category);
    lines.push(`| ${category} | ${(passRate * 100).toFixed(0)}% (${rows.filter((r) => r.pass).length}/${rows.length}) | ${mustPass ? "yes" : ""} |`);
  }
  const overallRate = results.filter((r) => r.pass).length / results.length;
  lines.push(`| **overall** | **${(overallRate * 100).toFixed(0)}%** | bar: ${(OVERALL_PASS_BAR * 100).toFixed(0)}% |`, "");

  const changed = results.filter((r) => previous[r.case.id] !== undefined && previous[r.case.id] !== r.pass);
  if (changed.length > 0) {
    lines.push("## Changed since last run", "");
    for (const r of changed) lines.push(`- ${r.case.id}: ${previous[r.case.id] ? "pass" : "fail"} -> ${r.pass ? "pass" : "fail"}`);
    lines.push("");
  }

  const failing = results.filter((r) => !r.pass);
  if (failing.length > 0) {
    lines.push("## Failing cases", "");
    for (const r of failing) {
      lines.push(`### ${r.case.id} (${r.case.category})`, "", "Turns:");
      for (const t of r.case.turns) lines.push(`- ${t}`);
      lines.push("", `Reply: ${r.replyText}`, "", `Tool calls: ${r.toolCalls.map((t) => t.name).join(", ") || "(none)"}`, "", "Failed checks:");
      for (const f of r.failures) lines.push(`- ${f}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

async function main() {
  process.env.DEMO_MODE = "true";
  const cases = EvalCasesFileSchema.parse(parseYaml(readFileSync("evals/cases.yaml", "utf8")));
  const client = getAnthropicClient();

  const results: CaseResult[] = [];
  for (const testCase of cases) {
    const result = await playCase(client, testCase);
    result.toneScore = await rateTone(client, result.replyText);
    results.push(result);
    console.log(`${result.pass ? "✓" : "✗"} ${testCase.id} (${testCase.category})`);
  }

  const previous = loadPreviousReport();
  writeFileSync("evals/report.md", renderReport(results, previous));
  writeFileSync("evals/.last-run.json", JSON.stringify(Object.fromEntries(results.map((r) => [r.case.id, r.pass])), null, 2));

  let failed = false;
  for (const category of MUST_PASS_CATEGORIES) {
    const rows = results.filter((r) => r.case.category === category);
    const rate = rows.filter((r) => r.pass).length / rows.length;
    if (rate < MUST_PASS_BAR) {
      console.error(`must-pass category "${category}" is at ${(rate * 100).toFixed(0)}%, needs ${MUST_PASS_BAR * 100}%`);
      failed = true;
    }
  }
  const overallRate = results.filter((r) => r.pass).length / results.length;
  if (overallRate < OVERALL_PASS_BAR) {
    console.error(`overall pass rate is ${(overallRate * 100).toFixed(0)}%, needs ${OVERALL_PASS_BAR * 100}%`);
    failed = true;
  }

  console.log(`\nWrote evals/report.md. Overall: ${(overallRate * 100).toFixed(0)}%.`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
