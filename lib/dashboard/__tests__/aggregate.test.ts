import { describe, expect, it } from "vitest";
import {
  anySynthetic,
  buildDistrictBlockTable,
  buildEligibilityOutcomes,
  buildFunnel,
  countByCapitalBand,
  countByFarmType,
  suppressSmallCounts,
  toCsv,
  type EventSummaryRow,
  type SessionSummaryRow,
} from "../aggregate";

function session(overrides: Partial<SessionSummaryRow> = {}): SessionSummaryRow {
  return { district: null, block: null, farmType: null, capitalBand: null, consent: false, synthetic: false, ...overrides };
}

describe("suppressSmallCounts", () => {
  it("hides counts below the minimum group size but keeps larger ones, sorted descending", () => {
    const counts = new Map([
      ["a", 10],
      ["b", 3],
      ["c", 5],
    ]);
    expect(suppressSmallCounts(counts, 5)).toEqual([
      { key: "a", count: 10 },
      { key: "c", count: 5 },
      { key: "b", count: null },
    ]);
  });
});

describe("countByFarmType / countByCapitalBand", () => {
  const rows = [
    session({ farmType: "layer", capitalBand: "under_50k" }),
    session({ farmType: "layer", capitalBand: "under_50k" }),
    session({ farmType: "layer", capitalBand: "under_50k" }),
    session({ farmType: "layer", capitalBand: "under_50k" }),
    session({ farmType: "layer", capitalBand: "under_50k" }),
    session({ farmType: "broiler_owned", capitalBand: "2l_5l" }),
  ];

  it("suppresses the broiler_owned/2l_5l groups (n=1 < 5) but not layer/under_50k (n=5)", () => {
    expect(countByFarmType(rows, 5)).toEqual([
      { key: "layer", count: 5 },
      { key: "broiler_owned", count: null },
    ]);
    expect(countByCapitalBand(rows, 5)).toEqual([
      { key: "under_50k", count: 5 },
      { key: "2l_5l", count: null },
    ]);
  });
});

describe("buildDistrictBlockTable", () => {
  it("groups by district+block and drops rows missing either field", () => {
    const rows = [
      ...Array(6).fill(session({ district: "Jhargram", block: "Jhargram" })),
      session({ district: "Jhargram", block: null }),
      session({ district: null, block: "X" }),
    ];
    expect(buildDistrictBlockTable(rows, 5)).toEqual([{ district: "Jhargram", block: "Jhargram", count: 6 }]);
  });
});

describe("buildFunnel", () => {
  it("reads started/consented off sessions and the rest off log_event counts", () => {
    const sessions = [
      ...Array(8).fill(session({ consent: true })),
      ...Array(2).fill(session({ consent: false })),
    ];
    const events: EventSummaryRow[] = [
      ...Array(6).fill({ stage: "onboarding_done", data: {}, synthetic: false }),
      ...Array(2).fill({ stage: "result_seen", data: {}, synthetic: false }), // below min group size
    ];
    const funnel = buildFunnel(sessions, events, 5);
    expect(funnel).toEqual([
      { stage: "started", count: 10 },
      { stage: "consented", count: 8 },
      { stage: "onboarding_done", count: 6 },
      { stage: "result_seen", count: null },
      { stage: "documents_or_office_opened", count: null },
      { stage: "applied", count: null },
    ]);
  });
});

describe("buildEligibilityOutcomes", () => {
  it("counts scheme/status pairs logged in result_seen events", () => {
    const events: EventSummaryRow[] = [
      ...Array(5).fill({ stage: "result_seen", data: { schemes: [{ id: "scheme-a", status: "eligible" }] }, synthetic: false }),
      { stage: "result_seen", data: { schemes: [{ id: "scheme-b", status: "likely" }] }, synthetic: false },
      { stage: "onboarding_done", data: {}, synthetic: false },
    ];
    expect(buildEligibilityOutcomes(events, 5)).toEqual([
      { schemeId: "scheme-a", status: "eligible", count: 5 },
      { schemeId: "scheme-b", status: "likely", count: null },
    ]);
  });
});

describe("anySynthetic", () => {
  it("is true if any session or event row is synthetic", () => {
    expect(anySynthetic([session({ synthetic: true })], [])).toBe(true);
    expect(anySynthetic([session()], [{ stage: "x", data: {}, synthetic: true }])).toBe(true);
    expect(anySynthetic([session()], [{ stage: "x", data: {}, synthetic: false }])).toBe(false);
  });
});

describe("toCsv", () => {
  it("renders headers and rows, quoting values that contain commas", () => {
    expect(toCsv([{ district: "Jhargram", count: 6 }])).toBe("district,count\nJhargram,6");
  });

  it("quotes and escapes embedded commas/quotes", () => {
    expect(toCsv([{ label: 'a,"b"', count: null }])).toBe('label,count\n"a,""b""",');
  });

  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});
