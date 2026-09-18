import type { CalcParam } from "../schemes/schema";
import { estimateLayer, LAYER_PARAM_KEYS, type LayerParamKey } from "./layer";
import {
  estimateBroilerOwned,
  BROILER_OWNED_PARAM_KEYS,
  type BroilerOwnedParamKey,
} from "./broilerOwned";
import {
  estimateBroilerContract,
  BROILER_CONTRACT_PARAM_KEYS,
  type BroilerContractParamKey,
} from "./broilerContract";
import type { EstimateResult, FarmType } from "./types";

export type AnyParamKey = LayerParamKey | BroilerOwnedParamKey | BroilerContractParamKey;

export interface EstimateFarmOk {
  ok: true;
  result: EstimateResult;
}
export interface EstimateFarmMissing {
  ok: false;
  farmType: FarmType;
  missing: AnyParamKey[];
}

/**
 * The estimate_farm tool contract from CLAUDE.md: farm_type + flock_size in,
 * capex/opex/revenue/break-even for low/base/high out. `capital` and `space`
 * from the user's onboarding profile are used by the agent tool handler
 * (Phase 3) to pick a flock_size band — the pure math here only needs the
 * resulting number of birds.
 */
export function estimateFarm(
  farmType: FarmType,
  flockSize: number,
  params: Partial<Record<AnyParamKey, CalcParam>>
): EstimateFarmOk | EstimateFarmMissing {
  if (farmType === "layer") {
    const outcome = estimateLayer(flockSize, params);
    return outcome.ok ? { ok: true, result: outcome.result } : { ok: false, farmType, missing: outcome.missing };
  }
  if (farmType === "broiler_owned") {
    const outcome = estimateBroilerOwned(flockSize, params);
    return outcome.ok ? { ok: true, result: outcome.result } : { ok: false, farmType, missing: outcome.missing };
  }
  const outcome = estimateBroilerContract(flockSize, params);
  return outcome.ok ? { ok: true, result: outcome.result } : { ok: false, farmType, missing: outcome.missing };
}

export const PARAM_KEYS_BY_FARM_TYPE: Record<FarmType, readonly AnyParamKey[]> = {
  layer: LAYER_PARAM_KEYS,
  broiler_owned: BROILER_OWNED_PARAM_KEYS,
  broiler_contract: BROILER_CONTRACT_PARAM_KEYS,
};
