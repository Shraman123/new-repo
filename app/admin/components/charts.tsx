// Sequential blue (step 450) and the fixed status palette, taken verbatim
// from the dataviz skill's validated reference palette — single-hue bars for
// magnitude, status colors (never reused for anything else) for eligibility.
const SEQUENTIAL_BLUE = "#2a78d6";
const STATUS_COLORS: Record<string, string> = {
  eligible: "#0ca30c",
  likely: "#fab219",
  unknown: "#898781",
  not_eligible: "#d03b3b",
};

function SuppressedNote() {
  return <span className="text-xs text-neutral-400">{"<5 (hidden)"}</span>;
}

export function BarList({ rows, unit }: { rows: { label: string; count: number | null }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count ?? 0));
  if (rows.length === 0) return <p className="text-sm text-neutral-500">No data yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <div>
            <div className="mb-1 truncate text-neutral-700">{row.label}</div>
            <div className="h-2 rounded bg-neutral-100">
              {row.count !== null && (
                <div
                  className="h-2 rounded"
                  style={{ width: `${Math.max(4, (row.count / max) * 100)}%`, backgroundColor: SEQUENTIAL_BLUE }}
                />
              )}
            </div>
          </div>
          <div className="tabular-nums text-neutral-900">
            {row.count === null ? <SuppressedNote /> : `${row.count.toLocaleString("en-IN")}${unit ?? ""}`}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Funnel({ steps }: { steps: { stage: string; count: number | null }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count ?? 0));
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step) => (
        <li key={step.stage} className="grid grid-cols-[160px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className="truncate text-neutral-700">{step.stage}</span>
          <div className="h-3 rounded bg-neutral-100">
            {step.count !== null && (
              <div
                className="h-3 rounded"
                style={{ width: `${Math.max(4, (step.count / max) * 100)}%`, backgroundColor: SEQUENTIAL_BLUE }}
              />
            )}
          </div>
          <span className="tabular-nums text-neutral-900">{step.count === null ? <SuppressedNote /> : step.count.toLocaleString("en-IN")}</span>
        </li>
      ))}
    </ol>
  );
}

const STATUS_LABEL: Record<string, string> = {
  eligible: "Eligible",
  likely: "Likely",
  unknown: "Unknown",
  not_eligible: "Not eligible",
};

export function EligibilityTable({ rows }: { rows: { schemeId: string; status: string; count: number | null }[] }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">No data yet.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-xs text-neutral-500">
          <th className="pb-1 pr-2">Scheme</th>
          <th className="pb-1 pr-2">Status</th>
          <th className="pb-1">Sessions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-neutral-100">
            <td className="py-1 pr-2">{row.schemeId}</td>
            <td className="py-1 pr-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[row.status] ?? STATUS_COLORS.unknown }} />
                {STATUS_LABEL[row.status] ?? row.status}
              </span>
            </td>
            <td className="tabular-nums py-1">{row.count === null ? <SuppressedNote /> : row.count.toLocaleString("en-IN")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DistrictBlockTable({ rows }: { rows: { district: string; block: string; count: number | null }[] }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">No data yet.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-xs text-neutral-500">
          <th className="pb-1 pr-2">District</th>
          <th className="pb-1 pr-2">Block</th>
          <th className="pb-1">Sessions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-t border-neutral-100">
            <td className="py-1 pr-2">{row.district}</td>
            <td className="py-1 pr-2">{row.block}</td>
            <td className="tabular-nums py-1">{row.count === null ? <SuppressedNote /> : row.count.toLocaleString("en-IN")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
