import type { CalcParam } from "../schemes/schema";

export type FarmType = "layer" | "broiler_owned" | "broiler_contract";
export type Scenario = "low" | "base" | "high";

export const SCENARIOS: readonly Scenario[] = ["low", "base", "high"];

// How far ahead we simulate before giving up on finding a break-even month.
export const BREAK_EVEN_HORIZON_MONTHS = 24;

export interface Assumption {
  param: string;
  value: number;
  unit: string;
  source: string;
  verified: boolean;
}

export interface ScenarioEstimate {
  scenario: Scenario;
  capexInr: number;
  monthlyOpexInr: number;
  monthlyRevenueInr: number;
  /** Month index (1-based) cumulative cashflow first reaches 0, or null if not within the horizon. */
  breakEvenMonth: number | null;
}

export interface EstimateResult {
  farmType: FarmType;
  flockSize: number;
  scenarios: ScenarioEstimate[];
  assumptions: Assumption[];
}

/** Picks the value to use for a given scenario, falling back to the base value when low/high is unset. */
export function pickScenarioValue(param: CalcParam, scenario: Scenario): number | null {
  if (scenario === "low") return param.low ?? param.value;
  if (scenario === "high") return param.high ?? param.value;
  return param.value;
}

export interface ResolvedParams<K extends string> {
  ok: true;
  values: Record<K, number>;
  assumptions: Assumption[];
}

export interface UnresolvedParams<K extends string> {
  ok: false;
  missing: K[];
}

/**
 * Resolves the named params for one scenario. Fails closed: if any required
 * param has no value (real data not filled in yet), returns the missing
 * keys instead of a number, so callers never invent a figure.
 */
export function resolveParams<K extends string>(
  params: Partial<Record<K, CalcParam>>,
  keys: readonly K[],
  scenario: Scenario
): ResolvedParams<K> | UnresolvedParams<K> {
  const values = {} as Record<K, number>;
  const assumptions: Assumption[] = [];
  const missing: K[] = [];
  for (const key of keys) {
    const param = params[key];
    const value = param ? pickScenarioValue(param, scenario) : null;
    if (param === undefined || value === null) {
      missing.push(key);
      continue;
    }
    values[key] = value;
    assumptions.push({
      param: key,
      value: param.value ?? value,
      unit: param.unit,
      source: param.source,
      verified: param.verified,
    });
  }
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, values, assumptions };
}
