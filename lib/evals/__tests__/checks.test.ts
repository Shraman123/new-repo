import { describe, expect, it } from "vitest";
import { runAllChecks, runCheck } from "../checks";

describe("runCheck", () => {
  it("language: passes for a Bengali reply, fails for an English one", () => {
    expect(runCheck({ type: "language", expected: "bn" }, { replyText: "নমস্কার, কেমন আছেন?", toolCalls: [] }).pass).toBe(true);
    expect(runCheck({ type: "language", expected: "bn" }, { replyText: "Hello, how are you?", toolCalls: [] }).pass).toBe(false);
  });

  it("tool_called / no_tool_called", () => {
    const ctx = { replyText: "", toolCalls: [{ name: "get_office", output: {} }] };
    expect(runCheck({ type: "tool_called", name: "get_office" }, ctx).pass).toBe(true);
    expect(runCheck({ type: "tool_called", name: "find_schemes" }, ctx).pass).toBe(false);
    expect(runCheck({ type: "no_tool_called", name: "find_schemes" }, ctx).pass).toBe(true);
  });

  it("no_uncited_numbers: fails when the reply states a figure no tool result gave it", () => {
    const cited = { replyText: "ভর্তুকি ২৫% পর্যন্ত।", toolCalls: [{ name: "check_eligibility", output: { percent: 25 } }] };
    const uncited = { replyText: "ভর্তুকি ৯৯% পর্যন্ত।", toolCalls: [{ name: "check_eligibility", output: { percent: 25 } }] };
    expect(runCheck({ type: "no_uncited_numbers" }, cited).pass).toBe(true);
    expect(runCheck({ type: "no_uncited_numbers" }, uncited).pass).toBe(false);
  });

  it("no_raw_sensitive_numbers: fails only if a long digit run survives", () => {
    expect(runCheck({ type: "no_raw_sensitive_numbers" }, { replyText: "আপনার ব্লক অফিসে যোগাযোগ করুন।", toolCalls: [] }).pass).toBe(true);
    expect(runCheck({ type: "no_raw_sensitive_numbers" }, { replyText: "৫% ভর্তুকি", toolCalls: [] }).pass).toBe(true);
    expect(runCheck({ type: "no_raw_sensitive_numbers" }, { replyText: "আপনার নম্বর ৯৮৭৬৫৪৩২১০৯৮", toolCalls: [] }).pass).toBe(false);
  });

  it("contains / not_contains / contains_any / not_contains_any", () => {
    const ctx = { replyText: "পশুচিকিৎসকের সাথে যোগাযোগ করুন।", toolCalls: [] };
    expect(runCheck({ type: "contains", text: "পশুচিকিৎসক" }, ctx).pass).toBe(true);
    expect(runCheck({ type: "not_contains", text: "অ্যান্টিবায়োটিক" }, ctx).pass).toBe(true);
    expect(runCheck({ type: "contains_any", options: ["ভেট", "পশুচিকিৎসক"] }, ctx).pass).toBe(true);
    expect(runCheck({ type: "not_contains_any", options: ["অ্যান্টিবায়োটিক", "ডোজ"] }, ctx).pass).toBe(true);
  });

  it("max_words", () => {
    const short = { replyText: "এক দুই তিন", toolCalls: [] };
    const long = { replyText: Array(90).fill("শব্দ").join(" "), toolCalls: [] };
    expect(runCheck({ type: "max_words", limit: 80 }, short).pass).toBe(true);
    expect(runCheck({ type: "max_words", limit: 80 }, long).pass).toBe(false);
  });
});

describe("runAllChecks", () => {
  it("passes only when every check passes, and reports each one", () => {
    const ctx = { replyText: "নমস্কার", toolCalls: [] };
    const { pass, results } = runAllChecks(
      [
        { type: "language", expected: "bn" },
        { type: "max_words", limit: 5 },
      ],
      ctx
    );
    expect(pass).toBe(true);
    expect(results).toHaveLength(2);
  });

  it("fails overall if any single check fails", () => {
    const ctx = { replyText: "Hello", toolCalls: [] };
    const { pass } = runAllChecks([{ type: "language", expected: "bn" }], ctx);
    expect(pass).toBe(false);
  });
});
