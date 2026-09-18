import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./client";
import { events, sessions } from "./schema";
import type { EventSummaryRow, SessionSummaryRow } from "../dashboard/aggregate";

export interface DashboardFilters {
  from?: Date;
  to?: Date;
  district?: string;
  block?: string;
  farmType?: string;
}

const profileDistrict = sql<string | null>`${sessions.profile}->>'district'`;
const profileBlock = sql<string | null>`${sessions.profile}->>'block'`;
const profileFarmType = sql<string | null>`${sessions.profile}->>'farm_type'`;
const profileCapitalBand = sql<string | null>`${sessions.profile}->>'capital_band'`;

function sessionFilterConditions(filters: DashboardFilters) {
  const conditions = [];
  if (filters.from) conditions.push(gte(sessions.createdAt, filters.from));
  if (filters.to) conditions.push(lte(sessions.createdAt, filters.to));
  if (filters.district) conditions.push(eq(profileDistrict, filters.district));
  if (filters.block) conditions.push(eq(profileBlock, filters.block));
  if (filters.farmType) conditions.push(eq(profileFarmType, filters.farmType));
  return conditions;
}

export async function fetchSessionSummaries(filters: DashboardFilters): Promise<SessionSummaryRow[]> {
  const conditions = sessionFilterConditions(filters);
  return getDb()
    .select({
      district: profileDistrict,
      block: profileBlock,
      farmType: profileFarmType,
      capitalBand: profileCapitalBand,
      consent: sessions.consent,
      synthetic: sessions.synthetic,
    })
    .from(sessions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
}

export async function fetchEventSummaries(filters: DashboardFilters): Promise<EventSummaryRow[]> {
  const conditions = [];
  if (filters.from) conditions.push(gte(events.createdAt, filters.from));
  if (filters.to) conditions.push(lte(events.createdAt, filters.to));
  if (filters.district) conditions.push(eq(profileDistrict, filters.district));
  if (filters.block) conditions.push(eq(profileBlock, filters.block));
  if (filters.farmType) conditions.push(eq(profileFarmType, filters.farmType));

  const needsSessionJoin = Boolean(filters.district || filters.block || filters.farmType);
  const query = getDb()
    .select({ stage: events.stage, data: events.data, synthetic: events.synthetic })
    .from(events);

  if (needsSessionJoin) {
    return query.innerJoin(sessions, eq(events.sessionId, sessions.id)).where(and(...conditions)) as unknown as Promise<EventSummaryRow[]>;
  }
  return query.where(conditions.length > 0 ? and(...conditions) : undefined) as unknown as Promise<EventSummaryRow[]>;
}
