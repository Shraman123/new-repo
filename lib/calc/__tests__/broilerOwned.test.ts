import { describe, expect, it } from "vitest";
import { estimateBroilerOwned, type BroilerOwnedParams } from "../broilerOwned";
import { p } from "./testHelpers";

// Hand-worked fixture, flockSize = 100, 10% mortality -> 90 surviving birds:
//   capex = 80 INR/sqft * 0.5 sqft/bird * 100 birds          = 4000
//   cycle = 35 batch days + 7 cleaning days                  = 42 days
//   feed cost/cycle  = 90 * 2kg * FCR 1.8 * 25 INR/kg         = 8100
//   chick cost/cycle = 100 * 25 INR/chick                     = 2500
//   revenue/cycle (base, 90 INR/kg) = 90 * 2kg * 90            = 16200
//   fixed monthly opex = 1500 + 300 + 200                      = 2000
const params: BroilerOwnedParams = {
  shed_cost_per_sqft: p(80, { unit: "INR/sqft" }),
  space_per_bird_sqft: p(0.5, { unit: "sqft/bird" }),
  chick_cost_inr: p(25, { unit: "INR/chick" }),
  batch_days: p(35, { unit: "days" }),
  cleaning_gap_days: p(7, { unit: "days" }),
  final_weight_kg: p(2, { unit: "kg/bird" }),
  fcr: p(1.8, { unit: "kg feed/kg bodyweight" }),
  feed_price_per_kg: p(25, { unit: "INR/kg" }),
  // low/high bracket the base live-bird price of 90 INR/kg.
  live_bird_price_per_kg: p(90, { unit: "INR/kg", low: 80, high: 100 }),
  mortality_percent: p(10, { unit: "percent" }),
  monthly_labour_inr: p(1500, { unit: "INR/month" }),
  monthly_electricity_inr: p(300, { unit: "INR/month" }),
  monthly_misc_inr: p(200, { unit: "INR/month" }),
};

describe("estimateBroilerOwned", () => {
  const outcome = estimateBroilerOwned(100, params);
  if (!outcome.ok) throw new Error("expected fixture to resolve");
  const byScenario = Object.fromEntries(outcome.result.scenarios.map((s) => [s.scenario, s]));

  it("computes capex from the fixture", () => {
    expect(byScenario.base.capexInr).toBe(4000);
  });

  // Cycle net (base) = revenue - feed - chick = 16200 - 8100 - 2500 = 5600.
  // Month 1: no cycle completes yet (30/42 < 1) -> cumulative = -4000 - 2000 = -6000.
  // Month 2: 1st cycle completes (60/42 = 1.43) -> -6000 + (5600-2000) = -2400.
  // Month 3: 2nd cycle completes (90/42 = 2.14) -> -2400 + 3600 = 1200 >= 0.
  it("finds break-even at month 3 for the base scenario", () => {
    expect(byScenario.base.breakEvenMonth).toBe(3);
  });

  // Low scenario (80 INR/kg): cycle net = 14400 - 8100 - 2500 = 3800, smaller
  // margin means an extra "opex-only" month (4) before the 3rd cycle lands,
  // pushing break-even out to month 7.
  it("takes longer to break even in the low scenario", () => {
    expect(byScenario.low.breakEvenMonth).toBe(7);
  });

  // High scenario (100 INR/kg): cycle net = 18000 - 8100 - 2500 = 7400, more
  // than enough to clear the capex by the 2nd cycle (month 3).
  it("breaks even at least as fast in the high scenario", () => {
    expect(byScenario.high.breakEvenMonth).toBe(3);
  });

  it("never returns a break-even month past the 24-month horizon", () => {
    for (const s of outcome.result.scenarios) {
      if (s.breakEvenMonth !== null) expect(s.breakEvenMonth).toBeLessThanOrEqual(24);
    }
  });
});
