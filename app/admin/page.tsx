import {
  anySynthetic,
  buildDistrictBlockTable,
  buildEligibilityOutcomes,
  buildFunnel,
  countByCapitalBand,
  countByFarmType,
} from "../../lib/dashboard/aggregate";
import type { EventSummaryRow, SessionSummaryRow } from "../../lib/dashboard/aggregate";
import { fetchEventSummaries, fetchSessionSummaries, type DashboardFilters } from "../../lib/db/dashboardQueries";
import { BarList, DistrictBlockTable, EligibilityTable, Funnel } from "./components/charts";

export const dynamic = "force-dynamic";

interface SearchParams {
  from?: string;
  to?: string;
  district?: string;
  block?: string;
  farm_type?: string;
}

function parseFilters(sp: SearchParams): DashboardFilters {
  return {
    from: sp.from ? new Date(sp.from) : undefined,
    to: sp.to ? new Date(sp.to) : undefined,
    district: sp.district || undefined,
    block: sp.block || undefined,
    farmType: sp.farm_type || undefined,
  };
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  let sessions: SessionSummaryRow[], events: EventSummaryRow[];
  let error: string | undefined;
  try {
    [sessions, events] = await Promise.all([fetchSessionSummaries(filters), fetchEventSummaries(filters)]);
  } catch (err) {
    sessions = [];
    events = [];
    error = err instanceof Error ? err.message : String(err);
  }

  const showSyntheticBanner = anySynthetic(sessions, events);

  return (
    <main lang="en" className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">KhamarMitra — enquiries</h1>
        <form action="/api/admin/logout" method="POST">
          <button className="text-sm text-neutral-500 underline">Sign out</button>
        </form>
      </div>

      {showSyntheticBanner && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          SYNTHETIC — this view includes seeded demo data (see scripts/seed-synthetic.ts), not real enquiries.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          Couldn&apos;t load data: {error}. Is DATABASE_URL set?
        </div>
      )}

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded border border-neutral-200 p-3 text-sm" method="GET">
        <label className="flex flex-col gap-1">
          From
          <input type="date" name="from" defaultValue={sp.from} className="rounded border border-neutral-300 px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          To
          <input type="date" name="to" defaultValue={sp.to} className="rounded border border-neutral-300 px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          District
          <input type="text" name="district" defaultValue={sp.district} className="rounded border border-neutral-300 px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          Block
          <input type="text" name="block" defaultValue={sp.block} className="rounded border border-neutral-300 px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          Farm type
          <select name="farm_type" defaultValue={sp.farm_type ?? ""} className="rounded border border-neutral-300 px-2 py-1">
            <option value="">All</option>
            <option value="layer">Layer</option>
            <option value="broiler_owned">Broiler (owned)</option>
            <option value="broiler_contract">Broiler (contract)</option>
          </select>
        </label>
        <button type="submit" className="rounded bg-neutral-900 px-3 py-1.5 text-white">
          Apply
        </button>
        <a
          href={`/api/admin/export?${new URLSearchParams(sp as Record<string, string>).toString()}`}
          className="rounded border border-neutral-300 px-3 py-1.5"
        >
          Export CSV
        </a>
      </form>

      <section className="mb-6 rounded border border-neutral-200 p-4">
        <h2 className="mb-3 font-medium">Funnel</h2>
        <Funnel steps={buildFunnel(sessions, events)} />
      </section>

      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded border border-neutral-200 p-4">
          <h2 className="mb-3 font-medium">Farm type interest</h2>
          <BarList rows={countByFarmType(sessions).map((r) => ({ label: r.key, count: r.count }))} />
        </section>
        <section className="rounded border border-neutral-200 p-4">
          <h2 className="mb-3 font-medium">Capital bands</h2>
          <BarList rows={countByCapitalBand(sessions).map((r) => ({ label: r.key, count: r.count }))} />
        </section>
      </div>

      <section className="mb-6 rounded border border-neutral-200 p-4">
        <h2 className="mb-3 font-medium">By district / block</h2>
        <DistrictBlockTable rows={buildDistrictBlockTable(sessions)} />
      </section>

      <section className="rounded border border-neutral-200 p-4">
        <h2 className="mb-3 font-medium">Eligibility outcomes by scheme</h2>
        <EligibilityTable rows={buildEligibilityOutcomes(events)} />
      </section>

      <p className="mt-6 text-xs text-neutral-400">
        Cells representing fewer than 5 sessions are hidden (SPEC §7 privacy rule). Raw conversations are never shown here — only aggregates.
      </p>
    </main>
  );
}
