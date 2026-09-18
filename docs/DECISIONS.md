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
