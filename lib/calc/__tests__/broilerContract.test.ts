import { describe, expect, it } from "vitest";
import { estimateBroilerContract, type BroilerContractParams } from "../broilerContract";
import { p } from "./testHelpers";

// Hand-worked fixture, flockSize = 100, 8% mortality -> 92 surviving birds.
// The integrator supplies chicks and feed, so the farmer's only cash costs
// are the shed (capex) and their own running costs (fixed monthly opex):
//   capex = 80 INR/sqft * 0.5 sqft/bird * 100 birds = 4000
//   cycle = 35 + 7 = 42 days
//   revenue/cycle (base, 25 INR/kg growing charge) = 92 * 2kg * 25 = 4600
//   fixed monthly opex = 1500 + 300 + 200 = 2000
const params: BroilerContractParams = {
  shed_cost_per_sqft: p(80, { unit: "INR/sqft" }),
  space_per_bird_sqft: p(0.5, { unit: "sqft/bird" }),
  batch_days: p(35, { unit: "days" }),
  cleaning_gap_days: p(7, { unit: "days" }),
  final_weight_kg: p(2, { unit: "kg/bird" }),
  // low/high bracket the base growing charge of 25 INR/kg.
  growing_charge_per_kg_inr: p(25, { unit: "INR/kg", low: 20, high: 30 }),
  mortality_percent: p(8, { unit: "percent" }),
  monthly_labour_inr: p(1500, { unit: "INR/month" }),
  monthly_electricity_inr: p(300, { unit: "INR/month" }),
  monthly_misc_inr: p(200, { unit: "INR/month" }),
};

describe("estimateBroilerContract", () => {
  const outcome = estimateBroilerContract(100, params);
  if (!outcome.ok) throw new Error("expected fixture to resolve");
  const byScenario = Object.fromEntries(outcome.result.scenarios.map((s) => [s.scenario, s]));

  it("computes capex and steady-state fixed opex from the fixture", () => {
    expect(byScenario.base.capexInr).toBe(4000);
    expect(byScenario.base.monthlyOpexInr).toBe(2000);
  });

  // month 1: no cycle yet -> -4000 - 2000 = -6000
  // month 2: 1 cycle (4600) -> -6000 + (4600-2000) = -3400
  // month 3: 2nd cycle -> -3400 + 2600 = -800
  // month 4: no new cycle -> -800 - 2000 = -2800
  // month 5: 3rd cycle -> -2800 + 2600 = -200
  // month 6: 4th cycle -> -200 + 2600 = 2400 >= 0
  it("finds break-even at month 6 for the base scenario", () => {
    expect(byScenario.base.breakEvenMonth).toBe(6);
  });

  // Lower growing charge (20 INR/kg) still clears the (smaller) capex
  // eventually, just a month later than base.
  it("takes a little longer to break even in the low scenario", () => {
    expect(byScenario.low.breakEvenMonth).toBe(7);
  });

  // Higher growing charge (30 INR/kg) clears capex by the 2nd cycle.
  it("breaks even fastest in the high scenario", () => {
    expect(byScenario.high.breakEvenMonth).toBe(3);
  });

  it("orders break-even months high <= base <= low", () => {
    expect(byScenario.high.breakEvenMonth).toBeLessThanOrEqual(byScenario.base.breakEvenMonth!);
    expect(byScenario.base.breakEvenMonth).toBeLessThanOrEqual(byScenario.low.breakEvenMonth!);
  });
});

describe("estimateBroilerContract — loss-making fixture", () => {
  it("returns null (not a huge number) when fixed costs outrun the growing charge", () => {
    const lossParams: BroilerContractParams = {
      ...params,
      growing_charge_per_kg_inr: p(5, { unit: "INR/kg" }),
      monthly_labour_inr: p(5000, { unit: "INR/month" }),
    };
    const outcome = estimateBroilerContract(100, lossParams);
    if (!outcome.ok) throw new Error("expected fixture to resolve");
    for (const s of outcome.result.scenarios) {
      expect(s.breakEvenMonth).toBeNull();
    }
  });
});
