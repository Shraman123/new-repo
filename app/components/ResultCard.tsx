import type { EstimateFarmResult, FindSchemesResult, GetDocumentsResult, GetOfficeResult } from "@/lib/agent/handlers";
import { NOT_VERIFIED_BADGE_BN } from "@/lib/agent/copy";

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) return null;
  return (
    <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
      {NOT_VERIFIED_BADGE_BN}
    </span>
  );
}

const STATUS_LABEL_BN: Record<string, string> = {
  eligible: "উপযুক্ত",
  likely: "সম্ভবত উপযুক্ত",
  unknown: "অজানা",
  not_eligible: "উপযুক্ত নয়",
};

const STATUS_CLASS: Record<string, string> = {
  eligible: "bg-green-100 text-green-800",
  likely: "bg-blue-100 text-blue-800",
  unknown: "bg-neutral-200 text-neutral-700",
  not_eligible: "bg-red-100 text-red-800",
};

function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function FindSchemesCard({ result }: { result: FindSchemesResult }) {
  if (result.matches.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
      {result.matches.map((m) => (
        <div key={m.id} className="border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{m.name_bn || m.name_en}</span>
            <span className={`rounded px-2 py-0.5 text-xs ${STATUS_CLASS[m.status] ?? ""}`}>
              {STATUS_LABEL_BN[m.status] ?? m.status}
            </span>
          </div>
          <p className="mt-1 text-neutral-600">{m.reason_bn}</p>
          <VerifiedBadge verified={m.verified} />
        </div>
      ))}
    </div>
  );
}

export function EstimateFarmCard({ result }: { result: EstimateFarmResult }) {
  if (!result.ok) return null;
  const byScenario = Object.fromEntries(result.result.scenarios.map((s) => [s.scenario, s]));
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-3 text-sm">
      {result.flockSizeAssumed && (
        <p className="mb-2 text-xs text-neutral-500">আপনার বাজেটের ভিত্তিতে আনুমানিক {result.result.flockSize} টি পাখি ধরে হিসাব করা হয়েছে।</p>
      )}
      <table className="w-full min-w-[280px] text-left">
        <thead>
          <tr className="text-xs text-neutral-500">
            <th></th>
            <th className="px-1">কম</th>
            <th className="px-1">মাঝারি</th>
            <th className="px-1">বেশি</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pr-2 text-neutral-600">শুরুর খরচ</td>
            <td className="px-1">{inr(byScenario.low.capexInr)}</td>
            <td className="px-1">{inr(byScenario.base.capexInr)}</td>
            <td className="px-1">{inr(byScenario.high.capexInr)}</td>
          </tr>
          <tr>
            <td className="pr-2 text-neutral-600">মাসিক আয়</td>
            <td className="px-1">{inr(byScenario.low.monthlyRevenueInr)}</td>
            <td className="px-1">{inr(byScenario.base.monthlyRevenueInr)}</td>
            <td className="px-1">{inr(byScenario.high.monthlyRevenueInr)}</td>
          </tr>
          <tr>
            <td className="pr-2 text-neutral-600">লাভের মুখ (মাস)</td>
            <td className="px-1">{byScenario.low.breakEvenMonth ?? "২৪+"}</td>
            <td className="px-1">{byScenario.base.breakEvenMonth ?? "২৪+"}</td>
            <td className="px-1">{byScenario.high.breakEvenMonth ?? "২৪+"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function GetDocumentsCard({ result }: { result: GetDocumentsResult }) {
  if (!result.found || result.documents.length === 0) return null;
  return (
    <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
      <ul className="list-inside list-disc">
        {result.documents.map((d, i) => (
          <li key={i}>{d.name_bn}</li>
        ))}
      </ul>
      {result.verified === false && <VerifiedBadge verified={false} />}
    </div>
  );
}

export function GetOfficeCard({ result }: { result: GetOfficeResult }) {
  if (!result.found) return null;
  return (
    <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
      <p className="font-medium">{result.office_bn}</p>
      <p className="text-neutral-600">{result.address}</p>
      {result.phone && (
        <a href={`tel:${result.phone}`} className="mt-1 inline-block text-blue-700 underline">
          {result.phone}
        </a>
      )}
      {result.verified === false && <VerifiedBadge verified={false} />}
    </div>
  );
}
