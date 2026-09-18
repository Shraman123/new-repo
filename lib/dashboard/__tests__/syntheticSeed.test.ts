import { describe, expect, it } from "vitest";
import { generateSyntheticData } from "../syntheticSeed";

describe("generateSyntheticData", () => {
  it("is deterministic for a given seed", () => {
    const a = generateSyntheticData(50, 7);
    const b = generateSyntheticData(50, 7);
    expect(a).toEqual(b);
  });

  it("marks every row synthetic and only logs events for consenting sessions", () => {
    const { sessions, events } = generateSyntheticData(200, 1);
    expect(sessions.every((s) => s.synthetic)).toBe(true);
    expect(events.every((e) => e.synthetic)).toBe(true);
    const nonConsentedIndexes = new Set(sessions.map((s, i) => (s.consent ? -1 : i)).filter((i) => i !== -1));
    expect(events.some((e) => nonConsentedIndexes.has(e.sessionIndex))).toBe(false);
  });

  it("never lets a later funnel stage appear without its predecessor for the same session", () => {
    const { events } = generateSyntheticData(300, 3);
    const stagesBySession = new Map<number, Set<string>>();
    for (const e of events) {
      if (!stagesBySession.has(e.sessionIndex)) stagesBySession.set(e.sessionIndex, new Set());
      stagesBySession.get(e.sessionIndex)!.add(e.stage);
    }
    const order = ["onboarding_done", "result_seen", "documents_or_office_opened", "applied"];
    for (const stages of stagesBySession.values()) {
      for (let i = 1; i < order.length; i++) {
        if (stages.has(order[i])) expect(stages.has(order[i - 1])).toBe(true);
      }
    }
  });
});
