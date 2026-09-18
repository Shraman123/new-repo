import { describe, expect, it } from "vitest";
import { estimateLayer, LAYER_PARAM_KEYS, type LayerParams } from "../layer";
import { p } from "./testHelpers";

// Hand-worked fixture, flockSize = 10 birds, 0% mortality (so survivingBirds = 10, no rounding):
//   shed: 50 INR/sqft * 1 sqft/bird * 10 birds       = 500
//   stock: 20 INR/bird * 10 birds                    = 200
//   capex = 500 + 200                                = 700
//   monthly feed = 10 birds * 100g/day * 30 / 1000kg * 20 INR/kg = 10*3*20 = 600
//   fixed monthly opex = 100 (labour) + 50 (electricity) + 50 (misc) = 200
//   monthly opex = 600 + 200                          = 800
//   eggs/bird/month = 30 * 50% = 15
//   monthly revenue (base, egg price 6) = 10 * 15 * 6 = 900
const params: LayerParams = {
  shed_cost_per_sqft: p(50, { unit: "INR/sqft" }),
  space_per_bird_sqft: p(1, { unit: "sqft/bird" }),
  pullet_cost_per_bird: p(20, { unit: "INR/bird" }),
  rearing_months_before_laying: p(1, { unit: "months" }),
  laying_rate_percent: p(50, { unit: "percent" }),
  feed_g_per_bird_per_day: p(100, { unit: "g/bird/day" }),
  feed_price_per_kg: p(20, { unit: "INR/kg" }),
  // low/high bracket the base price of 6 to exercise all three scenarios.
  egg_price_inr: p(6, { unit: "INR/egg", low: 5, high: 8 }),
  mortality_percent: p(0, { unit: "percent" }),
  monthly_labour_inr: p(100, { unit: "INR/month" }),
  monthly_electricity_inr: p(50, { unit: "INR/month" }),
  monthly_misc_inr: p(50, { unit: "INR/month" }),
};

describe("estimateLayer", () => {
  const outcome = estimateLayer(10, params);
  if (!outcome.ok) throw new Error("expected fixture to resolve");
  const { scenarios, assumptions } = outcome.result;
  const byScenario = Object.fromEntries(scenarios.map((s) => [s.scenario, s]));

  it("computes capex and steady-state opex/revenue from the fixture (base scenario)", () => {
    expect(byScenario.base.capexInr).toBe(700);
    expect(byScenario.base.monthlyOpexInr).toBe(800);
    expect(byScenario.base.monthlyRevenueInr).toBe(900);
  });

  // Month 1 is the rearing month: cumulative = -700 - 800 = -1500 (no eggs yet).
  // From month 2 on, net = 900 - 800 = +100/month, reaching 0 at month 16:
  //   -1500 + 15*100 = 0.
  it("finds break-even at month 16 for the base scenario", () => {
    expect(byScenario.base.breakEvenMonth).toBe(16);
  });

  // High scenario: revenue = 10*15*8 = 1200, net after rearing = +400/month.
  // -1500 + 4*400 = 100 >= 0 at month 5 (month 4 gives -300, still short).
  it("breaks even sooner in the high scenario", () => {
    expect(byScenario.high.breakEvenMonth).toBe(5);
  });

  // Low scenario: revenue = 10*15*5 = 750, net after rearing = -50/month —
  // costs never recover, so this must stay null within the 24-month horizon
  // rather than returning some enormous month number.
  it("reports no break-even (null) in the low scenario, not a huge number", () => {
    expect(byScenario.low.breakEvenMonth).toBeNull();
  });

  it("cites a source/unit/verified flag for every param used", () => {
    expect(assumptions).toHaveLength(LAYER_PARAM_KEYS.length);
    const eggPrice = assumptions.find((a) => a.param === "egg_price_inr");
    expect(eggPrice).toMatchObject({ value: 6, unit: "INR/egg", verified: false });
  });

  it("fails closed (no invented numbers) when a param has no value yet", () => {
    const incomplete: LayerParams = { ...params, egg_price_inr: { ...params.egg_price_inr!, value: null } };
    const missingOutcome = estimateLayer(10, incomplete);
    expect(missingOutcome.ok).toBe(false);
    if (!missingOutcome.ok) expect(missingOutcome.missing).toContain("egg_price_inr");
  });
});
