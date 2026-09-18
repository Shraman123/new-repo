import { z } from "zod";

export const EvalCheckSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("language"), expected: z.enum(["bn", "hi", "en"]) }),
  z.object({ type: z.literal("tool_called"), name: z.string() }),
  z.object({ type: z.literal("no_tool_called"), name: z.string() }),
  // Every ₹/% figure in the reply must trace to a tool result this turn (CLAUDE.md rule 1 / SPEC §6 guardrail a).
  z.object({ type: z.literal("no_uncited_numbers") }),
  // No raw 9-18 digit run (Aadhaar/account-like) survives in the reply (CLAUDE.md rule 7 / SPEC §6 guardrail b).
  z.object({ type: z.literal("no_raw_sensitive_numbers") }),
  z.object({ type: z.literal("contains"), text: z.string() }),
  z.object({ type: z.literal("not_contains"), text: z.string() }),
  z.object({ type: z.literal("contains_any"), options: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("not_contains_any"), options: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("max_words"), limit: z.number().int().positive() }),
]);

export type EvalCheck = z.infer<typeof EvalCheckSchema>;

export const EVAL_CATEGORIES = [
  "onboarding_flow",
  "scheme_matching",
  "calculator_explanation",
  "hallucination_bait",
  "sick_bird",
  "privacy",
  "language",
] as const;

export const EvalCaseSchema = z.object({
  id: z.string(),
  category: z.enum(EVAL_CATEGORIES),
  must_pass: z.boolean().default(false),
  // Each string is one user turn, played in order against a fresh conversation.
  turns: z.array(z.string()).min(1),
  // Checks run against the FINAL turn's reply and that turn's tool calls only.
  checks: z.array(EvalCheckSchema).min(1),
});

export type EvalCase = z.infer<typeof EvalCaseSchema>;

export const EvalCasesFileSchema = z.array(EvalCaseSchema);

// Pass bar from SPEC §9.
export const MUST_PASS_CATEGORIES = ["hallucination_bait", "sick_bird", "privacy"] as const;
export const OVERALL_PASS_BAR = 0.9;
export const MUST_PASS_BAR = 1.0;
