import { DEMO_MODE } from "../config";
import { loadCalcParams, loadDirectory, loadSchemeCards } from "../schemes/load";
import { findMatchingSchemes, checkEligibility, type UserProfile } from "../schemes/eligibility";
import type { SchemeCard, CalcParamFile } from "../schemes/schema";
import { estimateFarm, PARAM_KEYS_BY_FARM_TYPE, type AnyParamKey } from "../calc/estimateFarm";
import type { EstimateResult, FarmType } from "../calc/types";

function visibleCards(cards: SchemeCard[]): SchemeCard[] {
  return DEMO_MODE ? cards.filter((c) => c.verified) : cards;
}

function loadVisibleSchemeCards(): SchemeCard[] {
  return visibleCards(loadSchemeCards().ok.map((f) => f.data));
}

function findCard(id: string): SchemeCard | undefined {
  return loadVisibleSchemeCards().find((c) => c.id === id);
}

export interface FindSchemesResult {
  matches: {
    id: string;
    name_bn: string;
    name_en: string;
    status: string;
    reason_bn: string;
    citation: { file: string; page: number | null }[];
  }[];
  missingProfileFields: string[];
}

export function findSchemesHandler(profile: UserProfile): FindSchemesResult {
  const cards = loadVisibleSchemeCards();
  const matches = findMatchingSchemes(cards, profile);
  const missingProfileFields = [...new Set(matches.flatMap((m) => m.missingProfileFields))];
  return {
    matches: matches.slice(0, 3).map((m) => ({
      id: m.card.id,
      name_bn: m.card.name_bn,
      name_en: m.card.name_en,
      status: m.status,
      reason_bn: m.reasons.find((r) => r.status !== "unknown")?.rule_bn ?? m.card.benefit.summary_bn,
      citation: m.reasons.filter((r) => r.page !== null).map((r) => ({ file: m.card.source.file, page: r.page })),
    })),
    missingProfileFields,
  };
}

export type CheckEligibilityResult =
  | { found: true; status: string; reasons: { status: string; rule_bn: string; page: number | null }[] }
  | { found: false };

export function checkEligibilityHandler(schemeId: string, profile: UserProfile): CheckEligibilityResult {
  const card = findCard(schemeId);
  if (!card) return { found: false };
  const check = checkEligibility(card, profile);
  return {
    found: true,
    status: check.status,
    reasons: check.reasons.map((r) => ({ status: r.status, rule_bn: r.rule_bn, page: r.page })),
  };
}

export interface GetDocumentsResult {
  found: boolean;
  documents: { name_bn: string; page: number | null }[];
  sourceFile?: string;
}

export function getDocumentsHandler(schemeId: string): GetDocumentsResult {
  const card = findCard(schemeId);
  if (!card) return { found: false, documents: [] };
  return { found: true, documents: card.documents, sourceFile: card.source.file };
}

export interface GetOfficeResult {
  found: boolean;
  office_bn?: string;
  address?: string;
  phone?: string;
}

export function getOfficeHandler(district: string, block: string): GetOfficeResult {
  const files = loadDirectory().ok;
  for (const { data } of files) {
    if (data.district.trim().toLowerCase() !== district.trim().toLowerCase()) continue;
    const match = data.blocks.find((b) => b.block.trim().toLowerCase() === block.trim().toLowerCase());
    if (match) return { found: true, office_bn: match.office_bn, address: match.address, phone: match.phone };
  }
  return { found: false };
}

// Default starter flock sizes used only when the user hasn't given a
// specific number yet — a planning default, not a scheme fact, and always
// surfaced back to the user so they can correct it.
const DEFAULT_FLOCK_SIZE_BY_CAPITAL_BAND: Record<string, number> = {
  under_50k: 50,
  "50k_2l": 200,
  "2l_5l": 500,
  over_5l: 1000,
};

export type EstimateFarmResult =
  | { ok: true; flockSizeAssumed: boolean; result: EstimateResult }
  | { ok: false; reason: "missing_params"; missing: AnyParamKey[] }
  | { ok: false; reason: "cannot_determine_flock_size" };

export function estimateFarmHandler(
  farmType: FarmType,
  flockSize: number | undefined,
  capitalBand: string | undefined
): EstimateFarmResult {
  let resolvedFlockSize = flockSize;
  let flockSizeAssumed = false;
  if (resolvedFlockSize === undefined) {
    if (!capitalBand || !(capitalBand in DEFAULT_FLOCK_SIZE_BY_CAPITAL_BAND)) {
      return { ok: false, reason: "cannot_determine_flock_size" };
    }
    resolvedFlockSize = DEFAULT_FLOCK_SIZE_BY_CAPITAL_BAND[capitalBand];
    flockSizeAssumed = true;
  }

  const paramFiles = loadCalcParams().ok;
  const paramFile: CalcParamFile | undefined = paramFiles.find((f) => f.data.farm_type === farmType)?.data;
  const params = paramFile?.params ?? {};
  const outcome = estimateFarm(farmType, resolvedFlockSize, params);
  if (!outcome.ok) return { ok: false, reason: "missing_params", missing: outcome.missing };
  return { ok: true, flockSizeAssumed, result: outcome.result };
}

export { PARAM_KEYS_BY_FARM_TYPE };
