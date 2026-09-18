import type { CalcParam } from "../schemes/schema";
import { simulateBreakEven } from "./simulate";
import {
  resolveParams,
  SCENARIOS,
  type Assumption,
  type EstimateResult,
  type ScenarioEstimate,
} from "./types";

// Under a contract/integrator arrangement the integrator supplies chicks and
// feed and pays a growing charge per kg produced; the farmer's cash costs
// are the shed and their own running costs (labour, electricity, misc).
export const BROILER_CONTRACT_PARAM_KEYS = [
  "shed_cost_per_sqft",
  "space_per_bird_sqft",
  "batch_days",
  "cleaning_gap_days",
  "final_weight_kg",
  "growing_charge_per_kg_inr",
  "mortality_percent",
  "monthly_labour_inr",
  "monthly_electricity_inr",
  "monthly_misc_inr",
] as const;

export type BroilerContractParamKey = (typeof BROILER_CONTRACT_PARAM_KEYS)[number];
export type BroilerContractParams = Partial<Record<BroilerContractParamKey, CalcParam>>;

export interface BroilerContractEstimateOk {
  ok: true;
  result: EstimateResult;
}
export interface BroilerContractEstimateMissing {
  ok: false;
  missing: BroilerContractParamKey[];
}

export function estimateBroilerContract(
  flockSize: number,
  params: BroilerContractParams
): BroilerContractEstimateOk | BroilerContractEstimateMissing {
  const scenarios: ScenarioEstimate[] = [];
  let assumptions: Assumption[] = [];

  for (const scenario of SCENARIOS) {
    const resolved = resolveParams(params, BROILER_CONTRACT_PARAM_KEYS, scenario);
    if (!resolved.ok) return { ok: false, missing: resolved.missing };
    const v = resolved.values;
    if (scenario === "base") assumptions = resolved.assumptions;

    const survivingBirds = flockSize * (1 - v.mortality_percent / 100);
    const cycleDays = v.batch_days + v.cleaning_gap_days;

    const capexInr = v.shed_cost_per_sqft * v.space_per_bird_sqft * flockSize;

    const revenuePerCycleInr = survivingBirds * v.final_weight_kg * v.growing_charge_per_kg_inr;
    const fixedMonthlyOpexInr = v.monthly_labour_inr + v.monthly_electricity_inr + v.monthly_misc_inr;

    const cyclesPerMonth = 30 / cycleDays;
    const monthlyOpexInr = fixedMonthlyOpexInr;
    const monthlyRevenueInr = revenuePerCycleInr * cyclesPerMonth;

    const cyclesCompletedByMonth = (month: number) => Math.floor((month * 30) / cycleDays);
    let prevCycles = 0;
    const breakEvenMonth = simulateBreakEven(capexInr, (month) => {
      const cycles = cyclesCompletedByMonth(month);
      const cyclesThisMonth = cycles - prevCycles;
      prevCycles = cycles;
      return cyclesThisMonth * revenuePerCycleInr - fixedMonthlyOpexInr;
    });

    scenarios.push({ scenario, capexInr, monthlyOpexInr, monthlyRevenueInr, breakEvenMonth });
  }

  return { ok: true, result: { farmType: "broiler_contract", flockSize, scenarios, assumptions } };
}
