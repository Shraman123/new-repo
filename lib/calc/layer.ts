import type { CalcParam } from "../schemes/schema";
import { simulateBreakEven } from "./simulate";
import {
  resolveParams,
  SCENARIOS,
  type Assumption,
  type EstimateResult,
  type ScenarioEstimate,
} from "./types";

export const LAYER_PARAM_KEYS = [
  "shed_cost_per_sqft",
  "space_per_bird_sqft",
  "pullet_cost_per_bird",
  "rearing_months_before_laying",
  "laying_rate_percent",
  "feed_g_per_bird_per_day",
  "feed_price_per_kg",
  "egg_price_inr",
  "mortality_percent",
  "monthly_labour_inr",
  "monthly_electricity_inr",
  "monthly_misc_inr",
] as const;

export type LayerParamKey = (typeof LAYER_PARAM_KEYS)[number];
export type LayerParams = Partial<Record<LayerParamKey, CalcParam>>;

export interface LayerEstimateOk {
  ok: true;
  result: EstimateResult;
}
export interface LayerEstimateMissing {
  ok: false;
  missing: LayerParamKey[];
}

export function estimateLayer(flockSize: number, params: LayerParams): LayerEstimateOk | LayerEstimateMissing {
  const scenarios: ScenarioEstimate[] = [];
  let assumptions: Assumption[] = [];

  for (const scenario of SCENARIOS) {
    const resolved = resolveParams(params, LAYER_PARAM_KEYS, scenario);
    if (!resolved.ok) return { ok: false, missing: resolved.missing };
    const v = resolved.values;
    if (scenario === "base") assumptions = resolved.assumptions;

    const survivingBirds = flockSize * (1 - v.mortality_percent / 100);

    // Capex: shed + starting stock only. Feed and fixed costs during the
    // pre-laying rearing period are real cash spent before any egg revenue
    // arrives, but are modelled as monthly outflows in the break-even
    // simulation below rather than lumped into capex, so "capex" stays a
    // one-time figure and "monthly opex" describes the steady laying period.
    // Rearing feed is approximated at the laying-period feed rate — refine
    // once field-interview figures are in data/params.
    const shedCostInr = v.shed_cost_per_sqft * v.space_per_bird_sqft * flockSize;
    const stockCostInr = v.pullet_cost_per_bird * flockSize;
    const capexInr = shedCostInr + stockCostInr;

    const monthlyFeedCostInr =
      (survivingBirds * v.feed_g_per_bird_per_day * 30) / 1000 * v.feed_price_per_kg;
    const fixedMonthlyOpexInr = v.monthly_labour_inr + v.monthly_electricity_inr + v.monthly_misc_inr;
    const monthlyOpexInr = monthlyFeedCostInr + fixedMonthlyOpexInr;

    // Eggs/bird/month approximated as 30 days * average daily laying rate.
    const eggsPerBirdPerMonth = 30 * (v.laying_rate_percent / 100);
    const monthlyRevenueInr = survivingBirds * eggsPerBirdPerMonth * v.egg_price_inr;

    const rearingMonths = Math.round(v.rearing_months_before_laying);
    const breakEvenMonth = simulateBreakEven(capexInr, (month) =>
      month <= rearingMonths ? -monthlyOpexInr : monthlyRevenueInr - monthlyOpexInr
    );

    scenarios.push({ scenario, capexInr, monthlyOpexInr, monthlyRevenueInr, breakEvenMonth });
  }

  return { ok: true, result: { farmType: "layer", flockSize, scenarios, assumptions } };
}
