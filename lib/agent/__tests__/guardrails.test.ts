import { describe, expect, it } from "vitest";
import {
  bengaliDigitsToLatin,
  findUncitedFigures,
  redactSensitiveNumbers,
  SAFE_FALLBACK_BN,
} from "../guardrails";

describe("bengaliDigitsToLatin", () => {
  it("converts Bengali numerals and leaves other text alone", () => {
    expect(bengaliDigitsToLatin("₹১২৩ টাকা")).toBe("₹123 টাকা");
  });
});

describe("findUncitedFigures", () => {
  it("passes when every figure in the reply also appears in the tool results", () => {
    const reply = "ভর্তুকি ২৫% পর্যন্ত, সর্বোচ্চ ₹৫০,০০০।";
    const toolResults = JSON.stringify({ percent: 25, cap_inr: 50000 });
    expect(findUncitedFigures(reply, toolResults)).toEqual([]);
  });

  it("flags a figure the tools never returned", () => {
    const reply = "ভর্তুকি ৯০% পর্যন্ত।";
    const toolResults = JSON.stringify({ percent: 25 });
    expect(findUncitedFigures(reply, toolResults)).toEqual(["90"]);
  });

  it("has nothing to check when the reply states no figures", () => {
    expect(findUncitedFigures("আপনার ব্লক অফিসে যোগাযোগ করুন।", "{}")).toEqual([]);
  });
});

describe("redactSensitiveNumbers", () => {
  it("redacts a 12-digit Aadhaar-like number, spaced or not", () => {
    expect(redactSensitiveNumbers("আমার আধার ১২৩৪৫৬৭৮৯০১২")).toBe("আমার আধার [REDACTED]");
    expect(redactSensitiveNumbers("Aadhaar: 1234 5678 9012")).toBe("Aadhaar: [REDACTED]");
  });

  it("redacts a 9-18 digit account-like number", () => {
    expect(redactSensitiveNumbers("account 987654321")).toBe("account [REDACTED]");
  });

  it("leaves short numbers (e.g. a subsidy percent) untouched", () => {
    expect(redactSensitiveNumbers("25% ভর্তুকি")).toBe("25% ভর্তুকি");
  });
});

describe("SAFE_FALLBACK_BN", () => {
  it("is the exact fallback line from docs/SPEC.md §6", () => {
    expect(SAFE_FALLBACK_BN).toBe("এই বিষয়ে আমার কাছে যাচাই করা তথ্য নেই। আপনার ব্লক অফিসে জিজ্ঞাসা করুন।");
  });
});
