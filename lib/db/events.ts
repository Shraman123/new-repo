import { getDb } from "./client";
import { events } from "./schema";

/** Writes a non-PII analytics event for the dashboard funnel (SPEC §7). Never throws into the conversation. */
export async function logEvent(sessionId: string, stage: string, data: Record<string, unknown>): Promise<void> {
  try {
    await getDb().insert(events).values({ sessionId, stage, data });
  } catch (err) {
    console.error("log_event failed", err);
  }
}
