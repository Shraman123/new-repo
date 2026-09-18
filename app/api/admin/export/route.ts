import {
  buildDistrictBlockTable,
  buildEligibilityOutcomes,
  buildFunnel,
  countByCapitalBand,
  countByFarmType,
  toCsv,
} from "../../../../lib/dashboard/aggregate";
import { fetchEventSummaries, fetchSessionSummaries, type DashboardFilters } from "../../../../lib/db/dashboardQueries";

// CSV export of aggregates only (SPEC §7) — every section here already went
// through the n<5 suppression in lib/dashboard/aggregate.ts before this
// serialises it; no raw session or event data ever reaches this route.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters: DashboardFilters = {
    from: url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : undefined,
    to: url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined,
    district: url.searchParams.get("district") || undefined,
    block: url.searchParams.get("block") || undefined,
    farmType: url.searchParams.get("farm_type") || undefined,
  };

  const [sessions, events] = await Promise.all([fetchSessionSummaries(filters), fetchEventSummaries(filters)]);

  const sections = [
    ["# funnel", toCsv(buildFunnel(sessions, events).map((r) => ({ stage: r.stage, count: r.count })))],
    ["# farm_type", toCsv(countByFarmType(sessions).map((r) => ({ farm_type: r.key, count: r.count })))],
    ["# capital_band", toCsv(countByCapitalBand(sessions).map((r) => ({ capital_band: r.key, count: r.count })))],
    ["# district_block", toCsv(buildDistrictBlockTable(sessions).map((r) => ({ district: r.district, block: r.block, count: r.count })))],
    [
      "# eligibility_outcomes",
      toCsv(buildEligibilityOutcomes(events).map((r) => ({ scheme_id: r.schemeId, status: r.status, count: r.count }))),
    ],
  ];

  const body = sections.map(([label, csv]) => `${label}\n${csv}`).join("\n\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="khamarmitra-enquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
