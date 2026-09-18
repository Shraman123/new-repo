import { describe, expect, it } from "vitest";
import { SchemeCardSchema } from "../schema";

function baseCard() {
  return {
    id: "example-central-poultry-scheme",
    name_bn: "উদাহরণ",
    name_en: "Example",
    level: "central" as const,
    status: "unknown" as const,
    source: { file: "data/sources/example.pdf", url: "https://example.gov.in", retrieved_on: "2026-09-01" },
    eligibility: [],
    benefit: { type: "capital_subsidy" as const, summary_bn: "", percent: null, cap_inr: null, page: null },
    documents: [],
    apply_via: "",
    verified: false,
    verified_by: "",
    verified_on: "",
    notes: [],
  };
}

describe("SchemeCardSchema", () => {
  it("accepts a well-formed placeholder card", () => {
    expect(SchemeCardSchema.safeParse(baseCard()).success).toBe(true);
  });

  it("rejects an id that isn't kebab-case", () => {
    const card = { ...baseCard(), id: "Example_Scheme" };
    expect(SchemeCardSchema.safeParse(card).success).toBe(false);
  });

  it("rejects an unknown eligibility field", () => {
    const card = {
      ...baseCard(),
      eligibility: [{ rule_en: "", rule_bn: "", field: "not_a_real_field", op: "eq", value: null, page: null }],
    };
    expect(SchemeCardSchema.safeParse(card).success).toBe(false);
  });
});
