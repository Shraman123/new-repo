export const SAFE_FALLBACK_BN =
  "এই বিষয়ে আমার কাছে যাচাই করা তথ্য নেই। আপনার ব্লক অফিসে জিজ্ঞাসা করুন।";

const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Converts Bengali numerals to Latin digits; leaves everything else untouched. */
export function bengaliDigitsToLatin(text: string): string {
  return text.replace(/[০-৯]/g, (ch) => String(BENGALI_DIGITS.indexOf(ch)));
}

/** Pulls every ₹ amount and bare percentage out of a reply, digits normalised to Latin. */
export function extractRupeeAndPercentFigures(text: string): string[] {
  const normalised = bengaliDigitsToLatin(text);
  const figures: string[] = [];
  const rupeeRe = /₹\s*([\d,]+(?:\.\d+)?)/g;
  const percentRe = /([\d,]+(?:\.\d+)?)\s*%/g;
  for (const re of [rupeeRe, percentRe]) {
    for (const match of normalised.matchAll(re)) {
      figures.push(match[1].replace(/,/g, ""));
    }
  }
  return figures;
}

/**
 * The number-check guardrail: every ₹ amount and % the reply states must
 * appear somewhere in this turn's tool results. Returns the figures that
 * couldn't be traced back to a tool result — callers regenerate once, then
 * fall back to SAFE_FALLBACK_BN if it still fails (see docs/SPEC.md §6).
 */
export function findUncitedFigures(replyText: string, toolResultsText: string): string[] {
  const replyFigures = extractRupeeAndPercentFigures(replyText);
  if (replyFigures.length === 0) return [];
  const toolFigures = new Set(extractRupeeAndPercentFigures(toolResultsText).concat(bengaliDigitsToLatin(toolResultsText).match(/\d+(?:\.\d+)?/g) ?? []));
  return replyFigures.filter((figure) => !toolFigures.has(figure));
}

// A run of digits, optionally grouped with single spaces/hyphens (as Aadhaar
// numbers are often written, e.g. "1234 5678 9012"). Covers both 12-digit
// Aadhaar-like and 9-18 digit account-like numbers by digit count below.
const DIGIT_RUN_RE = /\d(?:[\d\- ]*\d)?/g;

/** Redacts Aadhaar-like (12-digit) and account-like (9-18 digit) numbers before storage/logging. */
export function redactSensitiveNumbers(text: string): string {
  const latin = bengaliDigitsToLatin(text);
  return latin.replace(DIGIT_RUN_RE, (match) => {
    const digitCount = (match.match(/\d/g) ?? []).length;
    return digitCount >= 9 && digitCount <= 18 ? "[REDACTED]" : match;
  });
}
