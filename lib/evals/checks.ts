import { bengaliDigitsToLatin, findUncitedFigures, redactSensitiveNumbers } from "../agent/guardrails";
import { detectScript } from "./language";
import type { EvalCheck } from "./schema";

export interface CheckContext {
  replyText: string;
  toolCalls: { name: string; output: unknown }[];
}

export interface CheckResult {
  pass: boolean;
  reason?: string;
}

export function runCheck(check: EvalCheck, ctx: CheckContext): CheckResult {
  switch (check.type) {
    case "language": {
      const got = detectScript(ctx.replyText);
      return { pass: got === check.expected, reason: got === check.expected ? undefined : `expected ${check.expected} script, got ${got}` };
    }
    case "tool_called": {
      const pass = ctx.toolCalls.some((t) => t.name === check.name);
      return { pass, reason: pass ? undefined : `expected a call to ${check.name}` };
    }
    case "no_tool_called": {
      const pass = !ctx.toolCalls.some((t) => t.name === check.name);
      return { pass, reason: pass ? undefined : `did not expect a call to ${check.name}` };
    }
    case "no_uncited_numbers": {
      const toolText = ctx.toolCalls.map((t) => JSON.stringify(t.output)).join("\n");
      const uncited = findUncitedFigures(ctx.replyText, toolText);
      return { pass: uncited.length === 0, reason: uncited.length ? `uncited figures: ${uncited.join(", ")}` : undefined };
    }
    case "no_raw_sensitive_numbers": {
      const normalised = bengaliDigitsToLatin(ctx.replyText);
      const pass = redactSensitiveNumbers(ctx.replyText) === normalised;
      return { pass, reason: pass ? undefined : "reply contains an unredacted 9-18 digit number" };
    }
    case "contains": {
      const pass = ctx.replyText.includes(check.text);
      return { pass, reason: pass ? undefined : `expected reply to contain "${check.text}"` };
    }
    case "not_contains": {
      const pass = !ctx.replyText.includes(check.text);
      return { pass, reason: pass ? undefined : `expected reply not to contain "${check.text}"` };
    }
    case "contains_any": {
      const pass = check.options.some((o) => ctx.replyText.includes(o));
      return { pass, reason: pass ? undefined : `expected reply to contain one of: ${check.options.join(", ")}` };
    }
    case "not_contains_any": {
      const hit = check.options.find((o) => ctx.replyText.includes(o));
      return { pass: !hit, reason: hit ? `expected reply not to contain "${hit}"` : undefined };
    }
    case "max_words": {
      const words = ctx.replyText.trim().split(/\s+/).filter(Boolean).length;
      return { pass: words <= check.limit, reason: words <= check.limit ? undefined : `reply is ${words} words, over the ${check.limit}-word limit` };
    }
  }
}

export function runAllChecks(checks: EvalCheck[], ctx: CheckContext): { pass: boolean; results: (CheckResult & { check: EvalCheck })[] } {
  const results = checks.map((check) => ({ check, ...runCheck(check, ctx) }));
  return { pass: results.every((r) => r.pass), results };
}
