# KhamarMitra — Claude Code prompts, phase by phase

## Before you start (manual, ~1 hour)

- Create an empty repo named `khamarmitra`. Put `CLAUDE.md` and `PROMPTS.md` in the root and `SPEC.md` in `docs/`.
- Get an Anthropic API key and a Postgres URL (Neon or Supabase free tier).
- Download the official documents yourself into `data/sources/`:
  - guidelines for central livestock/poultry schemes
  - West Bengal ARD department scheme pages and PDFs
  - any extension or training material on poultry economics

  List each one in `data/sources/README.md` with its URL and download date. Official PDFs only. No blogs.
- Put district/block ARD office contacts for 2–3 districts in a notes file: your home district, Jhargram, and one more. They come only from official district/department websites.

**How to run each phase:** paste the prompt, let Claude Code plan, read the plan, say OK, then review what it built. Run `/clear` between phases so each one starts fresh. `CLAUDE.md` is picked up automatically.

---

## Phase 0 — Scaffold

Read CLAUDE.md and docs/SPEC.md fully. Then scaffold the project:
- Next.js App Router + TypeScript + Tailwind, Drizzle + Postgres, Zod, Vitest, Playwright, ESLint.
- Create the folder layout from CLAUDE.md with placeholder READMEs where folders are empty.
- .env.example with ANTHROPIC_API_KEY, DATABASE_URL, ADMIN_PASSWORD, HASH_SALT, DEMO_MODE.
- lib/config.ts holding model names, message word limit, feature flags.
- npm scripts: dev, test, lint, validate-data, eval, chat (stub the last three for now).
- Noto Sans Bengali font, lang="bn" on <html>, a placeholder home page in Bengali with the disclaimer.
- docs/DECISIONS.md with today's date and the stack decisions.

Show me the plan first. Done when `npm run dev` shows the Bengali page and `npm test` passes.

## Phase 1 — Data layer + draft scheme cards

Phase 1 per SPEC §5.
1. Write Zod schemas for scheme cards, calculator params, and the office directory, exactly matching the shapes in SPEC §5.
2. Write scripts/validate-data.ts. It FAILS on schema errors, duplicate ids, or any number/rule missing a source page.
3. Read every PDF in data/sources/. Draft one scheme card per scheme or component relevant to poultry.
   STRICT RULES:
   - Copy numbers and conditions exactly as written, with the page number.
   - Use NO outside knowledge. If the PDF doesn't say it, leave it null.
   - verified: false on everything.
   - Anything ambiguous goes in `notes` as a question for me.
   - Write name_bn and rule_bn in simple Bengali, but keep rule_en faithful to the source text.
4. Draft data/directory/*.yaml from my notes file [paste path], verified:false.
5. Generate docs/VERIFY.md: one table row per number and rule (card id, field, value, file, page) for me to check against the source PDFs.

Plan first.

**Manual step:** go through VERIFY.md against the PDFs. Fix wrong values and set `verified: true`, `verified_by`, `verified_on`. This is the most important hour of the project.

## Phase 2 — Farm calculator

Phase 2: implement lib/calc per SPEC §5 (params) and the estimate_farm contract in CLAUDE.md.
- Pure functions, no I/O inside the math. Params are loaded from data/params/*.yaml via the Zod schema.
- Farm types: layer, broiler_owned, broiler_contract. Each returns capex, monthly opex and revenue, break-even month for low/base/high scenarios.
- Return an `assumptions` array: every param used, its value, unit, source, verified flag.
- If there is no break-even within 24 months, say so explicitly. Don't return a huge number.
- Create data/params/*.yaml with value: null placeholders and TODO sources. Do NOT invent values.
- Vitest: 3 hand-worked examples per farm type (show the arithmetic in comments), plus edge cases.

Plan first.

**Manual step:** fill data/params from official material and from farmer interviews. Record the source for every value.

## Phase 3 — Agent + guardrails

Phase 3: build lib/agent and POST /api/agent per SPEC §6 and the tool table in CLAUDE.md.
- @anthropic-ai/sdk tool-use loop with the model from lib/config.ts. Streamed responses.
- Tools: find_schemes, check_eligibility, estimate_farm, get_documents, get_office, log_event.
- Session state in Postgres: { id, profile, stage, consent, lang, created_at }. Nothing is stored without consent.
- System prompt in lib/agent/prompt.ts, based on the SPEC §6 draft.
- Guardrails in code:
  (a) number check: normalise Bengali digits → Latin; every ₹ amount and % in the reply must come from a tool result that turn, else regenerate once, else fall back to the safe message;
  (b) redaction of Aadhaar-like and account-like numbers before storage/logging;
  (c) hard cap on tool-loop iterations.
- log_event writes non-PII analytics events for the funnel in SPEC §7.
- scripts/chat.ts: a terminal chat against the agent (`npm run chat`), printing tool calls inline.
- Unit tests for the guardrails.

Plan first. Then demo 3 conversations in the terminal: a happy path, a fake-scheme question, and a sick-bird question.

## Phase 4 — Web chat UI

Phase 4: the mobile-first Bengali web chat.
- Target a 360px-wide Android screen. First-load JS < 200 KB. Show which components are client vs server.
- First message: disclaimer + consent buttons. Onboarding uses quick-reply buttons (SPEC §3).
- Result card component: scheme rows with status chip (eligible/likely/unknown) + citation; estimate range; next steps; document checklist; office contact.
- "যাচাই করা হয়নি" badge on anything unverified. "আরও বলুন" button for longer answers.
- Mic button: Web Speech API with bn-IN where supported; otherwise record audio and POST it to the agent.
- "আমার পরিকল্পনা" builds a plain-text summary and opens a WhatsApp share link.
- One Playwright test for the happy path.

Plan first. Run Lighthouse mobile at the end and report the scores.

## Phase 5 — Voice via Vaani

Clone github.com/Shraman123/AI-Call-Centre into ../vaani and study it: call flow, STT/TTS, and how it's wired up.

Write docs/VOICE_PLAN.md in THIS repo covering:
- a missed-call → callback flow (which telephony provider, costs, what number to use);
- bn-IN support in the STT/TTS pipeline;
- how each voice turn calls POST /api/agent with channel=voice. The agent must then use ≤2 short spoken turns per exchange;
- sending the full plan by SMS/WhatsApp after the call;
- failure cases: silence, noise, the user switching language.

Stop and wait for my OK. Then implement in ../vaani on a new branch `khamarmitra-voice`.

## Phase 6 — Department dashboard

Phase 6: /admin per SPEC §7.
- Password auth (ADMIN_PASSWORD), English UI, filters for date, district, block, farm type.
- Enquiries over time; district/block table; farm type and capital-band charts; eligibility outcomes by scheme; funnel.
- Suppress any cell with n < 5. CSV export of aggregates only.
- scripts/seed-synthetic.ts: realistic synthetic data. A SYNTHETIC banner is shown whenever active.

Plan first.

## Phase 7 — Evals

Phase 7 per SPEC §9.
- Write evals/cases.yaml with 60 cases across the categories and counts in SPEC §9. Write the cases yourself, covering the must-pass categories fully.
- scripts/eval.ts runs each case through the agent (DEMO_MODE on, a test DB). It applies deterministic checks first, then a Haiku rubric for tone/clarity.
- Output evals/report.md: pass rate per category, each failing transcript, and a diff vs the last run.
- Exit non-zero if any must-pass category is below 100% or the overall pass rate is below 90%.

Run it, show me the failures, and propose fixes. Don't change the must-pass cases to make them pass.

## Phase 8 — Deploy + demo material

- Deploy to Vercel with a production DB. Set env vars and DEMO_MODE=true for the public demo.
- README.md: what it is, a Mermaid architecture diagram, how to run it, the data-verification process.
- docs/DEMO_SCRIPT.md: a 90-second demo video script in Bengali, scene by scene. Persona: a young aspiring farmer.
- docs/BRIEF.md: a one-page brief in English for department officials. Cover the problem, the solution, the pilot results, and next steps.

Plan first.

## Phase 9 — Field test, then fix

Create docs/FIELD_TEST.md:
- a consent script in Bengali;
- 5 tasks for participants (e.g. "find out which scheme you might get");
- teach-back questions;
- an observation sheet (time taken, where they got stuck, any wrong info).

Also build a simple /admin/field-test page for logging each session.

**After testing with 10 people:**

Here are my field-test notes: [paste]. Group the issues by severity. For every issue, FIRST agree the fix with me, then implement it.

**When you're ready to email**, send the live link, the demo video and BRIEF.md, using the contact you confirmed on the department's official website.
