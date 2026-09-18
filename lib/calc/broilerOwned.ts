import type { CalcParam } from "../schemes/schema";
import { simulateBreakEven } from "./simulate";
import {
  resolveParams,
  SCENARIOS,
  type Assumption,
  type EstimateResult,
  type ScenarioEstimate,
} from "./types";

export const BROILER_OWNED_PARAM_KEYS = [
  "shed_cost_per_sqft",
  "space_per_bird_sqft",
  "chick_cost_inr",
  "batch_days",
  "cleaning_gap_days",
  "final_weight_kg",
  "fcr",
  "feed_price_per_kg",
  "live_bird_price_per_kg",
  "mortality_percent",
  "monthly_labour_inr",
  "monthly_electricity_inr",
  "monthly_misc_inr",
] as const;

export type BroilerOwnedParamKey = (typeof BROILER_OWNED_PARAM_KEYS)[number];
export type BroilerOwnedParams = Partial<Record<BroilerOwnedParamKey, CalcParam>>;

export interface BroilerOwnedEstimateOk {
  ok: true;
  result: EstimateResult;
}
export interface BroilerOwnedEstimateMissing {
  ok: false;
  missing: BroilerOwnedParamKey[];
}

export function estimateBroilerOwned(
  flockSize: number,
  params: BroilerOwnedParams
): BroilerOwnedEstimateOk | BroilerOwnedEstimateMissing {
  const scenarios: ScenarioEstimate[] = [];
  let assumptions: Assumption[] = [];

  for (const scenario of SCENARIOS) {
    const resolved = resolveParams(params, BROILER_OWNED_PARAM_KEYS, scenario);
    if (!resolved.ok) return { ok: false, missing: resolved.missing };
    const v = resolved.values;
    if (scenario === "base") assumptions = resolved.assumptions;

    const survivingBirds = flockSize * (1 - v.mortality_percent / 100);
    const cycleDays = v.batch_days + v.cleaning_gap_days;

    const capexInr = v.shed_cost_per_sqft * v.space_per_bird_sqft * flockSize;

    // Feed cost is approximated from FCR (feed kg per kg of bodyweight) on
    // the surviving birds' final weight, i.e. it ignores feed eaten by birds
    // that later die — a reasonable first-cut approximation, refine with
    // field-interview figures.
    const feedCostPerCycleInr = survivingBirds * v.final_weight_kg * v.fcr * v.feed_price_per_kg;
    const chickCostPerCycleInr = flockSize * v.chick_cost_inr;
    const revenuePerCycleInr = survivingBirds * v.final_weight_kg * v.live_bird_price_per_kg;

    const fixedMonthlyOpexInr = v.monthly_labour_inr + v.monthly_electricity_inr + v.monthly_misc_inr;
    // "Monthly" opex/revenue reported to the user are the cycle figures
    // spread evenly over the cycle length, for comparability across farm
    // types — the break-even simulation below books cost/revenue at each
    // cycle's completion instead, since that's when the cash actually moves.
    const cyclesPerMonth = 30 / cycleDays;
    const monthlyOpexInr = (feedCostPerCycleInr + chickCostPerCycleInr) * cyclesPerMonth + fixedMonthlyOpexInr;
    const monthlyRevenueInr = revenuePerCycleInr * cyclesPerMonth;

    const cyclesCompletedByMonth = (month: number) => Math.floor((month * 30) / cycleDays);
    let prevCycles = 0;
    const breakEvenMonth = simulateBreakEven(capexInr, (month) => {
      const cycles = cyclesCompletedByMonth(month);
      const cyclesThisMonth = cycles - prevCycles;
      prevCycles = cycles;
      return cyclesThisMonth * (revenuePerCycleInr - feedCostPerCycleInr - chickCostPerCycleInr) - fixedMonthlyOpexInr;
    });

    scenarios.push({ scenario, capexInr, monthlyOpexInr, monthlyRevenueInr, breakEvenMonth });
  }

  return { ok: true, result: { farmType: "broiler_owned", flockSize, scenarios, assumptions } };
}
