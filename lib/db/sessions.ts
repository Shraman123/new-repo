import type Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { sessions, type SessionRow } from "./schema";

export async function createSession(lang: string): Promise<SessionRow> {
  const [row] = await getDb().insert(sessions).values({ lang }).returning();
  return row;
}

export async function getSession(id: string): Promise<SessionRow | undefined> {
  const [row] = await getDb().select().from(sessions).where(eq(sessions.id, id));
  return row;
}

export async function saveSessionTurn(
  id: string,
  fields: { history: Anthropic.MessageParam[]; profile: Record<string, unknown>; stage: string; consent: boolean }
): Promise<void> {
  await getDb().update(sessions).set(fields).where(eq(sessions.id, id));
}
