# Decisions log

## 2026-09-18 — Phase 0 stack

- Next.js App Router + TypeScript + Tailwind (v4, via `@tailwindcss/postcss`), scaffolded with `create-next-app` and merged into the existing repo (which already held `CLAUDE.md`, `PROMPTS.md`, `docs/SPEC.md`).
- Postgres via Drizzle ORM (`drizzle-orm` + `pg` + `drizzle-kit`); connection deferred to Phase 3 when session/analytics tables are designed.
- Validation with Zod; YAML data files parsed with `js-yaml`.
- `@anthropic-ai/sdk` for the Claude API; model ids centralized in `lib/config.ts` (`claude-sonnet-5` for the agent, `claude-haiku-4-5-20251001` for cheap tasks).
- Tests: Vitest + Testing Library + jsdom for unit/component tests, `@playwright/test` for the one end-to-end happy path (Phase 4). `tsx` runs the TypeScript scripts (`validate-data`, `eval`, `chat`, `seed-synthetic`) directly, no separate build step.
- Font: `Noto Sans Bengali` via `next/font/google`; `lang="bn"` on `<html>`.
- `npm run validate-data`, `npm run eval`, and `npm run chat` are stubbed in Phase 0 (see `scripts/`) and implemented in Phases 1, 7, and 3 respectively.
- `.gitignore` excludes `.env*` but keeps `.env.example` tracked, and ignores Playwright/eval output directories.

## 2026-09-18 — Phase 4 web chat

- Quick-reply buttons: rather than a separate structured-output channel, the agent is instructed (`lib/agent/prompt.ts`) to end a message with `[Option]` groups, which the client parses (`lib/client/quickReplies.ts`) into tappable buttons — matches how the options are already written inline in `docs/SPEC.md` §3's example transcript.
- `/api/agent` streams as `text/event-stream` with `chunk`/`done` events; the reply text itself is fully computed server-side before streaming starts (the number-check guardrail needs the whole reply to validate it), so "streaming" here is a progressive-delivery transport, not token-by-token generation. True token streaming can be layered on later via `messages.stream()` without changing the wire format.
- Result cards (scheme matches, farm estimate, documents, office contact) render from the turn's tool outputs, which the route now includes in its `done` event — this is what shows the "যাচাই করা হয়নি" badge and status chips per CLAUDE.md rule 3, not prose parsing.
- First-load JS for `/`, measured from a production build's chunks (gzip, matching how Next has historically reported this number): ~177 KB, under the 200 KB budget in CLAUDE.md rule 8 but with little headroom — worth rechecking after Phase 5/6 add any shared client code.
- The Playwright happy-path test mocks `/api/agent` (`page.route`) rather than calling the real model, so it runs without `ANTHROPIC_API_KEY`/`DATABASE_URL`; it exercises the consent gate, streaming render, and quick-reply tap, not live model behaviour.
- The mic button uses the browser's `SpeechRecognition` Web Speech API (`bn-IN`) only; it does nothing where that API is unavailable (e.g. many non-Chromium mobile browsers) rather than falling back to record-and-upload, which would need a separate transcription endpoint — flagged as a follow-up, not built here.

## 2026-09-18 — Phase 6 admin dashboard

- Auth is a shared password cookie, not per-account: `lib/admin/auth.ts` compares the cookie value directly against `ADMIN_PASSWORD` (no hashing) so the same check works in both the Node route handlers and the Edge `proxy.ts` (formerly `middleware.ts` — Next 16 renamed the convention; `node:crypto` isn't available on Edge, which is why this stays hash-free). Matches "password auth for v1" in SPEC §7; revisit if `/admin` ever needs per-official accounts.
- `lib/dashboard/aggregate.ts` is pure (no DB) and does the n<5 suppression (SPEC §7 privacy rule) by replacing a small group's `count` with `null` rather than dropping the row — so a district still appears in a table even when its count is hidden. `lib/db/dashboardQueries.ts` is the thin, untested-here layer that turns filters into Drizzle queries against `sessions`/`events`.
- Added `sessions.synthetic`/`events.synthetic` columns so `/admin` can show the SYNTHETIC banner whenever any row in the current filtered view came from `scripts/seed-synthetic.ts` (`lib/dashboard/syntheticSeed.ts` is the pure, seeded-PRNG generator, unit-tested for determinism and funnel-order consistency).
- The funnel's `onboarding_done`/`result_seen`/`documents_or_office_opened`/`applied` steps depend on the agent actually calling `log_event` with exactly those stage names — added to `lib/agent/prompt.ts` (`lib/agent/funnel.ts` holds the canonical list) since nothing else logs them. `result_seen` also carries the matched scheme ids/status in `data`, which is what `buildEligibilityOutcomes` reads.
- Chart colors follow the dataviz skill's validated reference palette verbatim (sequential blue `#2a78d6` for magnitude bars/funnel, the fixed status palette for eligibility outcomes) — no new palette was invented, so the validator script wasn't re-run.
- Not run end-to-end against a real Postgres instance (no `DATABASE_URL` here): login/logout and the empty-state rendering were verified against a live dev server, but the aggregation queries themselves are reviewed, not executed against real rows. Run `npm run db:migrate` then `npm run seed-synthetic` once `DATABASE_URL` is set, to check the charts against real data.

## 2026-09-18 — Phase 7 evals

- `evals/cases.yaml` has the 60 cases and per-category counts SPEC §9 specifies; a Vitest test (`lib/evals/__tests__/casesFile.test.ts`) checks the file against the Zod schema and those exact counts/must-pass flags, so a future edit that breaks the shape or the count fails `npm test`, not just `npm run eval`.
- Grading is deterministic-first as SPEC §9 asks: `lib/evals/checks.ts` reuses the same guardrail functions the agent runs in production (`findUncitedFigures`, `redactSensitiveNumbers`) so an eval case checks the same logic a real conversation would hit, not a separate reimplementation. The Haiku tone/clarity rubric (`rateTone` in `scripts/eval.ts`) is recorded in the report but never flips pass/fail — an LLM-graded score is too noisy to gate a 90%/100% bar on, and the deterministic checks are what SPEC §9 actually lists as required (right tool, numbers match, citation, language).
- Several categories collapse onto the same underlying guardrail: "hallucination bait" and "calculator explanation" both mostly test `no_uncited_numbers` (the number-check guardrail) from opposite directions — one confirms the model doesn't invent a figure with no data, the other confirms it doesn't drop or alter a real one.
- `scripts/eval.ts` needs `ANTHROPIC_API_KEY` (there's no key in this environment, so it hasn't been run against the live model — verified only that it loads/validates `cases.yaml` correctly, per the Vitest test above, and fails clearly with the right exit code when the key is missing). `evals/report.md` and `evals/.last-run.json` (the diff baseline for "changed since last run") are both generated output, gitignored — the first real run has nothing to diff against.
