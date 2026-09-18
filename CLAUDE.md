# KhamarMitra (খামারমিত্র) — guide for Claude Code

## What this is
A Bengali-first assistant for people in West Bengal who want to start a poultry farm, mostly rural youth doing it for the first time. It answers four questions:
1. Which government schemes might I qualify for?
2. What will the farm roughly cost, and when does it break even?
3. Which documents do I need?
4. Which office do I go to?

It also has an aggregate dashboard for the Animal Resources Development Department. The dashboard shows how many people are enquiring, from which blocks, and where they drop off.

This is an **independent, unofficial pilot**. It is NOT a government service.
- Full product spec: `docs/SPEC.md`
- Build order: `PROMPTS.md`

## Non-negotiable rules
1. **No invented facts.** The following come ONLY from files in `/data`: scheme names, eligibility rules, subsidy percentages and caps, documents, office contacts, and calculator parameters. Every entry has a source URL, a page number and a `verified` flag. If the data is missing, the bot says it doesn't know and points the user to the block office. The LLM must never fill in a number from its own knowledge.
2. **Code computes numbers; the LLM only explains them.** `/lib/calc` is deterministic TypeScript covered by unit tests. The agent calls it and explains the result.
3. **Unverified data is visible.** Anything with `verified: false` shows a "যাচাই করা হয়নি" (not verified) badge. It is excluded completely when `DEMO_MODE=true`.
4. **Bengali first.**
   - All user-facing text is in Bengali (bn-IN), in a simple spoken register at roughly a class-8 reading level.
   - If the user writes in Hindi or English, reply in their language. Default to Bengali. Treat Banglish (Bengali written in Latin script) as Bengali.
   - Use Bengali numerals and ₹ lakh/হাজার in chat. Accept both Bengali and Latin digits as input.
   - The admin dashboard is in English.
5. **No animal medicine dosing.**
   - For sick birds, give only basic advice: isolate them and contact a vet. Include the block office contact.
   - Sudden mass deaths could be bird flu. Tell the user to report to the block office immediately, and not to handle, sell or eat the dead birds.
   - Never name antibiotics or give doses.
6. **Never imply official status.** Do not use any government emblem or department logo, or any wording that suggests this is official. A disclaimer appears on every screen and in the first message:
   > এটি একটি স্বাধীন, পরীক্ষামূলক সহায়ক — সরকারি পরিষেবা নয়। চূড়ান্ত তথ্যের জন্য আপনার ব্লকের প্রাণিসম্পদ বিকাশ অফিসে যোগাযোগ করুন।
7. **Privacy (India DPDP Act 2023 spirit).**
   - Ask for consent before storing anything.
   - Store phone numbers only as salted hashes.
   - Redact Aadhaar-like and bank-account-like numbers before they are stored or logged.
   - The dashboard shows aggregates only, with a minimum group size of 5.
8. **Cheap phones, weak networks.**
   - First-load JS stays under 200 KB, and the app must work on 3G.
   - Chat messages stay under about 80 words, with a "আরও বলুন" (tell me more) button for longer answers.

## Architecture
The core agent is one HTTP endpoint. Every channel is a thin adapter over it.

```
Web chat (PWA) ─┐
Voice (Vaani)  ─┼──▶ POST /api/agent ──▶ Claude (tool use) ──▶ tools ──▶ /data + /lib/calc + Postgres
WhatsApp       ─┘
```

## Stack
- Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel
- Postgres (Neon or Supabase) with Drizzle ORM
- Claude API via `@anthropic-ai/sdk`:
  - `claude-sonnet-5` for the conversation agent
  - `claude-haiku-4-5-20251001` for cheap tasks: intent tags, clustering questions, grading evals
  - Keep model names in `lib/config.ts` and confirm them against the current docs before shipping.
- Validation: Zod. Tests: Vitest, plus one Playwright end-to-end happy path.
- Voice: reuse the Vaani pipeline (github.com/Shraman123/AI-Call-Centre) as a separate service that calls `/api/agent`.

## Repo layout
```
app/                  web chat (Bengali) + /admin dashboard
app/api/agent/        the single agent endpoint
lib/agent/            system prompt, tool definitions, tool handlers, guardrails
lib/calc/             farm cost & break-even engine (pure functions)
lib/schemes/          load + validate scheme cards, eligibility matcher
lib/config.ts         model names, limits, feature flags
data/sources/         official PDFs (downloaded by hand, never edited) + README.md listing URL & date
data/schemes/*.yaml   scheme cards
data/params/*.yaml    calculator parameters
data/directory/*.yaml office contacts by district/block
evals/                test cases + reports
scripts/              chat CLI, eval runner, data validator, seeders
docs/                 SPEC.md, DECISIONS.md, VERIFY.md, VOICE_PLAN.md, BRIEF.md
```

## Agent tools (contracts)
| Tool | Input | Output |
|---|---|---|
| `find_schemes` | user profile | matching scheme cards, why each matched, what info is still missing |
| `check_eligibility` | scheme_id, profile | `eligible` / `likely` / `not_eligible` / `unknown`, with reasons and citations (card id + page) |
| `estimate_farm` | farm_type, flock_size, capital, space | capex, monthly opex and revenue, break-even month for low/base/high scenarios, assumptions with sources |
| `get_documents` | scheme_id | document checklist with citations |
| `get_office` | district, block | contact from the directory, or "not in directory yet" |
| `log_event` | stage, non-PII data | nothing (writes an analytics event) |

## Commands (created in phase 0)
- `npm run dev`: local server
- `npm test`: unit tests
- `npm run validate-data`: schema-check everything in `/data`
- `npm run eval`: run the agent eval suite and write `evals/report.md`
- `npm run chat`: talk to the agent in the terminal
- `npm run lint`

## How to work with me
- **Plan first.** For any feature, show me the plan and wait for my OK before writing code.
- One feature per branch. Keep commits small and use conventional commit messages.
- After editing `/data`, run `npm run validate-data`.
- After changing the agent prompt or tools, run `npm run eval` and report the pass rate against the last run.
- If the spec is ambiguous, ask me. Record every decision in `docs/DECISIONS.md` with the date.
- Before adding a dependency, tell me why.
- Never commit secrets. Keep them in `.env.local`, and keep `.env.example` current.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
