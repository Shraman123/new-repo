import type { EligibilityRuleSchema, SchemeCard } from "./schema";
import type { z } from "zod";

export type EligibilityRule = z.infer<typeof EligibilityRuleSchema>;

export interface UserProfile {
  age?: number;
  district?: string;
  block?: string;
  farm_type?: string;
  capital_band?: string;
  space_band?: string;
  prior_experience?: boolean;
  social_category?: string;
  gender?: string;
}

export type EligibilityStatus = "eligible" | "likely" | "not_eligible" | "unknown";

export interface RuleReason {
  status: "eligible" | "not_eligible" | "unknown";
  rule_bn: string;
  rule_en: string;
  page: number | null;
}

export interface EligibilityCheck {
  cardId: string;
  status: EligibilityStatus;
  reasons: RuleReason[];
}

function evaluateRule(rule: EligibilityRule, profile: UserProfile): "eligible" | "not_eligible" | "unknown" {
  if (rule.field === "manual" || rule.value === null) return "unknown";
  const profileValue = profile[rule.field as keyof UserProfile];
  if (profileValue === undefined) return "unknown";

  switch (rule.op) {
    case "eq":
      return profileValue === rule.value ? "eligible" : "not_eligible";
    case "in":
      return Array.isArray(rule.value) && rule.value.includes(profileValue) ? "eligible" : "not_eligible";
    case "gte":
      return typeof profileValue === "number" && typeof rule.value === "number" && profileValue >= rule.value
        ? "eligible"
        : "not_eligible";
    case "lte":
      return typeof profileValue === "number" && typeof rule.value === "number" && profileValue <= rule.value
        ? "eligible"
        : "not_eligible";
    case "between": {
      if (!Array.isArray(rule.value) || rule.value.length !== 2 || typeof profileValue !== "number") return "unknown";
      const [min, max] = rule.value as [number, number];
      return profileValue >= min && profileValue <= max ? "eligible" : "not_eligible";
    }
    case "manual":
      return "unknown";
  }
}

/**
 * eligible: every rule we could evaluate matched, and we knew enough to evaluate all of them.
 * not_eligible: at least one rule we could evaluate did not match.
 * likely: no rule failed, but at least one couldn't be evaluated (missing profile info).
 * unknown: nothing could be evaluated at all (e.g. no eligibility rules, or all "manual").
 */
export function checkEligibility(card: SchemeCard, profile: UserProfile): EligibilityCheck {
  const reasons: RuleReason[] = card.eligibility.map((rule) => ({
    status: evaluateRule(rule, profile),
    rule_bn: rule.rule_bn,
    rule_en: rule.rule_en,
    page: rule.page,
  }));

  const hasFailure = reasons.some((r) => r.status === "not_eligible");
  const hasUnknown = reasons.some((r) => r.status === "unknown");
  const hasEligible = reasons.some((r) => r.status === "eligible");

  let status: EligibilityStatus;
  if (hasFailure) status = "not_eligible";
  else if (reasons.length === 0 || (hasUnknown && !hasEligible)) status = "unknown";
  else if (hasUnknown) status = "likely";
  else status = "eligible";

  return { cardId: card.id, status, reasons };
}

export interface SchemeMatch extends EligibilityCheck {
  card: SchemeCard;
  missingProfileFields: string[];
}

/** Used by find_schemes: ranks candidates and reports what onboarding info would sharpen the match. */
export function findMatchingSchemes(cards: SchemeCard[], profile: UserProfile): SchemeMatch[] {
  const rank: Record<EligibilityStatus, number> = { eligible: 0, likely: 1, unknown: 2, not_eligible: 3 };
  return cards
    .map((card) => {
      const check = checkEligibility(card, profile);
      const missingProfileFields = [
        ...new Set(
          card.eligibility
            .filter((rule) => rule.field !== "manual" && profile[rule.field as keyof UserProfile] === undefined)
            .map((rule) => rule.field)
        ),
      ];
      return { ...check, card, missingProfileFields };
    })
    .filter((match) => match.status !== "not_eligible")
    .sort((a, b) => rank[a.status] - rank[b.status]);
}
