import type { CalcParam } from "../../schemes/schema";

/** Builds a CalcParam quickly for tests. Not real data — see data/params/*.yaml for that. */
export function p(value: number, opts: Partial<CalcParam> = {}): CalcParam {
  return {
    value,
    unit: opts.unit ?? "",
    low: opts.low ?? null,
    high: opts.high ?? null,
    source: opts.source ?? "test-fixture",
    page_or_note: opts.page_or_note ?? "test-fixture",
    verified: opts.verified ?? false,
  };
}
