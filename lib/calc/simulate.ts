import { BREAK_EVEN_HORIZON_MONTHS } from "./types";

/**
 * Walks forward month by month from -capexInr, adding each month's
 * (revenue - opex), and returns the first month (1-based) where the
 * cumulative balance reaches 0, or null if that doesn't happen within
 * the horizon. Never returns a huge/unbounded number for "no break-even".
 */
export function simulateBreakEven(
  capexInr: number,
  monthlyNet: (month: number) => number,
  horizonMonths: number = BREAK_EVEN_HORIZON_MONTHS
): number | null {
  let cumulative = -capexInr;
  if (cumulative >= 0) return 0;
  for (let month = 1; month <= horizonMonths; month++) {
    cumulative += monthlyNet(month);
    if (cumulative >= 0) return month;
  }
  return null;
}
