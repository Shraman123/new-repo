import { describe, expect, it } from "vitest";
import type { SchemeCard } from "../schema";
import { checkEligibility, findMatchingSchemes } from "../eligibility";

function card(overrides: Partial<SchemeCard> = {}): SchemeCard {
  return {
    id: "example",
    name_bn: "",
    name_en: "",
    level: "central",
    status: "active",
    source: { file: "", url: "", retrieved_on: "" },
    eligibility: [],
    benefit: { type: "capital_subsidy", summary_bn: "", percent: null, cap_inr: null, page: null },
    documents: [],
    apply_via: "",
    verified: false,
    verified_by: "",
    verified_on: "",
    notes: [],
    ...overrides,
  };
}

describe("checkEligibility", () => {
  it("is unknown when there are no eligibility rules", () => {
    expect(checkEligibility(card(), {}).status).toBe("unknown");
  });

  it("is eligible when every rule matches and all needed profile fields are known", () => {
    const c = card({
      eligibility: [{ rule_en: "18-35", rule_bn: "", field: "age", op: "between", value: [18, 35], page: 3 }],
    });
    expect(checkEligibility(c, { age: 25 }).status).toBe("eligible");
  });

  it("is not_eligible when a rule fails", () => {
    const c = card({
      eligibility: [{ rule_en: "18-35", rule_bn: "", field: "age", op: "between", value: [18, 35], page: 3 }],
    });
    expect(checkEligibility(c, { age: 60 }).status).toBe("not_eligible");
  });

  it("is likely when some rules match and others can't be evaluated yet", () => {
    const c = card({
      eligibility: [
        { rule_en: "18-35", rule_bn: "", field: "age", op: "between", value: [18, 35], page: 3 },
        { rule_en: "SC/ST benefit", rule_bn: "", field: "social_category", op: "in", value: ["sc", "st"], page: 5 },
      ],
    });
    expect(checkEligibility(c, { age: 25 }).status).toBe("likely");
  });

  it("is unknown for a manual-only rule", () => {
    const c = card({
      eligibility: [{ rule_en: "district office discretion", rule_bn: "", field: "manual", op: "manual", value: null, page: null }],
    });
    expect(checkEligibility(c, {}).status).toBe("unknown");
  });
});

describe("findMatchingSchemes", () => {
  it("drops not_eligible cards and ranks eligible above likely above unknown", () => {
    const eligible = card({
      id: "eligible-one",
      eligibility: [{ rule_en: "", rule_bn: "", field: "age", op: "between", value: [18, 35], page: 1 }],
    });
    const notEligible = card({
      id: "not-eligible-one",
      eligibility: [{ rule_en: "", rule_bn: "", field: "age", op: "between", value: [40, 60], page: 1 }],
    });
    const likely = card({
      id: "likely-one",
      eligibility: [
        { rule_en: "", rule_bn: "", field: "age", op: "between", value: [18, 35], page: 1 },
        { rule_en: "", rule_bn: "", field: "district", op: "eq", value: "Jhargram", page: 2 },
      ],
    });

    const matches = findMatchingSchemes([notEligible, likely, eligible], { age: 25 });
    expect(matches.map((m) => m.card.id)).toEqual(["eligible-one", "likely-one"]);
    expect(matches[1].missingProfileFields).toEqual(["district"]);
  });
});
