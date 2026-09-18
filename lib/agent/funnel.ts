// Canonical log_event stage names for the dashboard funnel (SPEC §7).
// "started" and "consented" don't need an event — they're read straight off
// the sessions table (a row exists / consent is true).
export const FUNNEL_STAGES = [
  "onboarding_done",
  "result_seen",
  "documents_or_office_opened",
  "applied",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];
