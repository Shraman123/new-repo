import { describe, expect, it } from "vitest";
import { simulateBreakEven } from "../simulate";

describe("simulateBreakEven", () => {
  it("returns 0 when capex is already covered", () => {
    expect(simulateBreakEven(0, () => 100)).toBe(0);
  });

  it("finds the first month the cumulative balance reaches zero", () => {
    // -1000, then +250/month: -750, -500, -250, 0 -> month 4.
    expect(simulateBreakEven(1000, () => 250)).toBe(4);
  });

  it("returns null (never a huge number) when the balance never recovers", () => {
    expect(simulateBreakEven(1000, () => -10, 24)).toBeNull();
  });

  it("respects a custom horizon", () => {
    expect(simulateBreakEven(1000, () => 100, 5)).toBeNull();
    expect(simulateBreakEven(1000, () => 100, 10)).toBe(10);
  });
});
