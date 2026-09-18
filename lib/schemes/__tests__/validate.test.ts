import { describe, expect, it } from "vitest";
import type { SchemeCard, CalcParamFile } from "../schema";
import { checkCardCitations, checkDuplicateCardIds, checkParamCitations } from "../validate";

function baseCard(overrides: Partial<SchemeCard> = {}): SchemeCard {
  return {
    id: "example",
    name_bn: "",
    name_en: "",
    level: "central",
    status: "unknown",
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

describe("checkCardCitations", () => {
  it("flags an eligibility rule with a value but no page", () => {
    const card = baseCard({
      eligibility: [{ rule_en: "age 18-35", rule_bn: "", field: "age", op: "between", value: [18, 35], page: null }],
    });
    expect(checkCardCitations(card)).toHaveLength(1);
  });

  it("allows a fully-null placeholder rule", () => {
    const card = baseCard({
      eligibility: [{ rule_en: "", rule_bn: "", field: "manual", op: "manual", value: null, page: null }],
    });
    expect(checkCardCitations(card)).toHaveLength(0);
  });

  it("flags a benefit percent with no page", () => {
    const card = baseCard({ benefit: { type: "capital_subsidy", summary_bn: "", percent: 25, cap_inr: null, page: null } });
    expect(checkCardCitations(card)).toHaveLength(1);
  });

  it("passes when the page is cited", () => {
    const card = baseCard({ benefit: { type: "capital_subsidy", summary_bn: "", percent: 25, cap_inr: null, page: 7 } });
    expect(checkCardCitations(card)).toHaveLength(0);
  });
});

describe("checkDuplicateCardIds", () => {
  it("flags a second file reusing the same id", () => {
    const cards = [
      { file: "a.yaml", data: baseCard({ id: "dup" }) },
      { file: "b.yaml", data: baseCard({ id: "dup" }) },
    ];
    expect(checkDuplicateCardIds(cards)).toHaveLength(1);
  });
});

describe("checkParamCitations", () => {
  it("flags a value with neither source nor page/note", () => {
    const file: CalcParamFile = {
      farm_type: "layer",
      params: { feed_price_per_kg: { value: 42, unit: "INR/kg", low: null, high: null, source: "", page_or_note: "", verified: false } },
    };
    expect(checkParamCitations(file)).toHaveLength(1);
  });

  it("allows a null placeholder value", () => {
    const file: CalcParamFile = {
      farm_type: "layer",
      params: { feed_price_per_kg: { value: null, unit: "INR/kg", low: null, high: null, source: "", page_or_note: "TODO", verified: false } },
    };
    expect(checkParamCitations(file)).toHaveLength(0);
  });
});
