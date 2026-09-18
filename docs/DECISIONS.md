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
