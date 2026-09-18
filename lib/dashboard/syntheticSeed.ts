// Deterministic PRNG (mulberry32) so the generator is reproducible in tests
// without needing a real random source.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DISTRICTS: { district: string; blocks: string[] }[] = [
  { district: "Jhargram", blocks: ["Jhargram", "Gopiballavpur-I", "Nayagram"] },
  { district: "Bankura", blocks: ["Bankura-I", "Khatra", "Raipur"] },
  { district: "Purba Medinipur", blocks: ["Tamluk", "Contai-I", "Egra-I"] },
];

const FARM_TYPES = ["layer", "broiler_owned", "broiler_contract"] as const;
const CAPITAL_BANDS = ["under_50k", "50k_2l", "2l_5l", "over_5l"] as const;
const SCHEME_IDS = ["synthetic-central-poultry-venture", "synthetic-state-backyard-scheme"];

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export interface SyntheticSessionInput {
  profile: { district: string; block: string; farm_type: string; capital_band: string };
  consent: boolean;
  synthetic: true;
  createdAtDaysAgo: number;
}

export interface SyntheticEventInput {
  sessionIndex: number;
  stage: string;
  data: Record<string, unknown>;
  synthetic: true;
  createdAtDaysAgo: number;
}

export interface SyntheticData {
  sessions: SyntheticSessionInput[];
  events: SyntheticEventInput[];
}

/** Pure generator (no I/O) so it's unit-testable; scripts/seed-synthetic.ts does the actual DB insert. */
export function generateSyntheticData(count: number, seed = 42): SyntheticData {
  const rng = mulberry32(seed);
  const sessions: SyntheticSessionInput[] = [];
  const events: SyntheticEventInput[] = [];

  for (let i = 0; i < count; i++) {
    const { district, blocks } = pick(rng, DISTRICTS);
    const daysAgo = Math.floor(rng() * 60);
    const consent = rng() < 0.75;
    sessions.push({
      profile: { district, block: pick(rng, blocks), farm_type: pick(rng, FARM_TYPES), capital_band: pick(rng, CAPITAL_BANDS) },
      consent,
      synthetic: true,
      createdAtDaysAgo: daysAgo,
    });

    if (!consent) continue;
    // Each stage is reached only if the previous one was, modelling drop-off down the funnel.
    const stageChances: [string, number][] = [
      ["onboarding_done", 0.75],
      ["result_seen", 0.85],
      ["documents_or_office_opened", 0.4],
      ["applied", 0.35],
    ];
    let reachedPrevious = true;
    for (const [stage, chance] of stageChances) {
      reachedPrevious = reachedPrevious && rng() < chance;
      if (!reachedPrevious) break;
      const data = stage === "result_seen" ? { schemes: [{ id: pick(rng, SCHEME_IDS), status: pick(rng, ["eligible", "likely", "unknown"]) }] } : {};
      events.push({ sessionIndex: i, stage, data, synthetic: true, createdAtDaysAgo: daysAgo });
    }
  }

  return { sessions, events };
}
