import { getDb } from "../lib/db/client";
import { events, sessions } from "../lib/db/schema";
import { generateSyntheticData } from "../lib/dashboard/syntheticSeed";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  const count = Number(process.argv[2] ?? 300);
  const { sessions: syntheticSessions, events: syntheticEvents } = generateSyntheticData(count);

  const db = getDb();
  const sessionIds: string[] = [];
  for (const s of syntheticSessions) {
    const [row] = await db
      .insert(sessions)
      .values({ profile: s.profile, consent: s.consent, synthetic: true, createdAt: daysAgo(s.createdAtDaysAgo) })
      .returning({ id: sessions.id });
    sessionIds.push(row.id);
  }

  if (syntheticEvents.length > 0) {
    await db.insert(events).values(
      syntheticEvents.map((e) => ({
        sessionId: sessionIds[e.sessionIndex],
        stage: e.stage,
        data: e.data,
        synthetic: true,
        createdAt: daysAgo(e.createdAtDaysAgo),
      }))
    );
  }

  console.log(`Seeded ${syntheticSessions.length} synthetic sessions and ${syntheticEvents.length} events.`);
  console.log("They're marked synthetic:true — the /admin dashboard shows a SYNTHETIC banner whenever any are in view.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
