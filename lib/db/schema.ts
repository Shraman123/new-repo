import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// One row per chat session. Nothing is written here until the user consents
// (see CLAUDE.md rule 7); a declined-consent session lives only in memory
// for the request's lifetime.
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  profile: jsonb("profile").notNull().default({}),
  // The Anthropic message history (user/assistant turns, tool_use/tool_result
  // blocks) needed to continue the conversation. Only written once consent is true.
  history: jsonb("history").notNull().default([]),
  stage: text("stage").notNull().default("greeting"),
  consent: boolean("consent").notNull().default(false),
  lang: text("lang").notNull().default("bn"),
  // True only for rows scripts/seed-synthetic.ts wrote, so /admin can show
  // the SYNTHETIC banner (SPEC §7) whenever any are in the filtered view.
  synthetic: boolean("synthetic").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Non-PII analytics events for the dashboard funnel (SPEC §7). log_event
// writes here; message content never does.
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  stage: text("stage").notNull(),
  data: jsonb("data").notNull().default({}),
  synthetic: boolean("synthetic").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SessionRow = typeof sessions.$inferSelect;
export type EventRow = typeof events.$inferSelect;
