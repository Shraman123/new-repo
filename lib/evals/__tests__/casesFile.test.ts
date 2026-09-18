import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load as parseYaml } from "js-yaml";
import { describe, expect, it } from "vitest";
import { EvalCasesFileSchema, MUST_PASS_CATEGORIES } from "../schema";

const raw = parseYaml(readFileSync(join(process.cwd(), "evals/cases.yaml"), "utf8"));

describe("evals/cases.yaml", () => {
  it("matches the schema", () => {
    const result = EvalCasesFileSchema.safeParse(raw);
    if (!result.success) throw new Error(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  });

  const cases = EvalCasesFileSchema.parse(raw);

  it("has exactly 60 cases with unique ids", () => {
    expect(cases).toHaveLength(60);
    expect(new Set(cases.map((c) => c.id)).size).toBe(60);
  });

  it("matches SPEC §9's per-category counts", () => {
    const counts = new Map<string, number>();
    for (const c of cases) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    expect(Object.fromEntries(counts)).toEqual({
      onboarding_flow: 10,
      scheme_matching: 15,
      calculator_explanation: 10,
      hallucination_bait: 10,
      sick_bird: 5,
      privacy: 5,
      language: 5,
    });
  });

  it("marks every case in a must-pass category (and only those) as must_pass", () => {
    for (const c of cases) {
      const shouldBeMustPass = (MUST_PASS_CATEGORIES as readonly string[]).includes(c.category);
      expect(c.must_pass).toBe(shouldBeMustPass);
    }
  });
});
