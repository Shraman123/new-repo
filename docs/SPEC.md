# KhamarMitra — Product Spec v0.1

## 1. Why this exists

**Public context.** In a July 2026 interview with The Statesman, West Bengal's MoS (Independent Charge) for Animal Resources Development said four things:
- The state is short on eggs and imports them from Andhra Pradesh.
- The government wants more individuals to start poultry farms, with state support.
- Central schemes that had been stalled will now be implemented fully.
- He wants educated unemployed youth to use these schemes to become self-reliant.

**The citizen's gap.** A young person in a village who wants to start a farm doesn't know:
- which schemes exist, or whether they qualify
- what a farm really costs
- which papers they need, or which office to go to

The information is scattered across English PDFs, and block offices are busy.

**The department's gap.** There is no live view of demand: who is interested, where they are, and what is stopping them.

KhamarMitra closes both gaps. The first version covers poultry only. Dairy, goat and fisheries can come later using the same engine with new data files.

## 2. Users

| Who | Situation | Needs |
|---|---|---|
| **Aspiring farmer** (primary) | 18–35, first farm, basic Android phone, patchy data; some are not comfortable reading | Plain-Bengali answers, voice, a clear next step |
| **Small existing farmer** | Runs 100–500 birds, wants to scale | Scheme eligibility, cost of expanding |
| **Department official** | Block, district or state level | Demand by area, bottlenecks, CSV export |

## 3. Core journey (happy path)

1. **Greeting**, with the disclaimer and a consent request. If the user declines consent, the session still works but nothing is stored beyond the session.

   > আপনার উত্তরগুলো (নাম ও ফোন নম্বর ছাড়া) পরিষেবাটি উন্নত করতে সংরক্ষণ করা হবে। রাজি আছেন? [হ্যাঁ, রাজি] [না]

2. **Onboarding.** Ask at most 6 questions, one at a time, with quick-reply buttons:
   - আপনি কোন জেলায় থাকেন? → কোন ব্লক?
   - কী ধরনের খামার করতে চান? [ডিমের মুরগি (লেয়ার)] [মাংসের মুরগি (ব্রয়লার)] [হাঁস] [দেশি মুরগি] [এখনও ঠিক করিনি]
   - শুরু করার জন্য হাতে কত টাকা আছে? [৫০ হাজারের কম] [৫০ হাজার–২ লাখ] [২–৫ লাখ] [৫ লাখের বেশি]
   - খামারের জন্য কতটা জায়গা আছে? [বাড়ির উঠান] [ছোট জমি] [বড় জমি] [জানি না]
   - আগে কখনও মুরগি/পশু পালন করেছেন? [হ্যাঁ] [না]
   - Ask about social category or gender **only if** a matched scheme's benefit depends on it. Say why you are asking and make it skippable.

3. **Result card:**
   - the top 2–3 schemes, each with a status chip and a one-line reason and citation
   - the farm estimate as a low/base/high range, never a single number
   - the next 3 steps
   - a document checklist
   - the office contact, with tap-to-call

4. **Follow-up.** The user can ask anything freely. "মানুষের সাথে কথা বলতে চাই" (I want to talk to a person) → office contact.

5. **Share.** "আমার পরিকল্পনা" (my plan) produces a plain-text summary the user can share on WhatsApp.

## 4. Channels (in build order)

1. **Web chat PWA**, mobile-first, with a mic button and read-aloud.
2. **Voice via Vaani**, using a missed-call → callback flow so users with no data can still use it. Answers are spoken in short turns, and the full plan is sent by SMS/WhatsApp where possible.
3. **WhatsApp** (optional) via the Meta WhatsApp Cloud API. This needs business verification, so start that early if you want it.

## 5. Data

Everything factual lives in `/data` as YAML, validated with Zod. **Values below are placeholders.** Fill them only from official documents in `data/sources/`.

### Scheme card — `data/schemes/<id>.yaml`

```yaml
id: example-central-poultry-scheme   # rename to the real scheme/component
name_bn: ""
name_en: ""
level: central                       # central | state
status: unknown                      # active | closed | unknown
source:
  file: data/sources/<file>.pdf
  url: ""
  retrieved_on: ""
eligibility:                         # every rule needs a page
  - rule_en: ""
    rule_bn: ""
    field: age                       # which profile field it checks, or "manual"
    op: between                      # eq | in | gte | lte | between | manual
    value: null
    page: null
benefit:
  type: capital_subsidy              # capital_subsidy | interest_subvention | loan | training | other
  summary_bn: ""
  percent: null
  cap_inr: null
  page: null
documents:
  - name_bn: ""
    page: null
apply_via: ""                        # portal URL or office type
verified: false
verified_by: ""
verified_on: ""
notes: []                            # open questions for the human verifier
```

### Calculator parameters — `data/params/<farm_type>.yaml`

Each parameter has this shape: `{ value, unit, low, high, source, page_or_note, verified }`.

- **Layer:** shed cost per sq ft, space per bird, pullet/chick cost, rearing months before laying, laying rate (%), laying months, feed g/bird/day, feed ₹/kg, egg farm-gate price, mortality %, cull-bird sale price, labour, electricity, vaccines and misc.
- **Broiler (owned):** chick cost, batch days, cleaning gap days, final weight, FCR, feed ₹/kg, live-bird ₹/kg, mortality %, batches per year.
- **Broiler (contract/integrator):** growing charge per bird or per kg, and what the integrator supplies. This is often the lowest-capital route, so confirm how it works locally with farmers.
- **Sources:** extension publications, district ARD offices, and interviews with local farmers. Record local-farmer figures as `source: field-interview-<date>` and keep them `verified: false` until you have cross-checked them.

### Office directory — `data/directory/<district>.yaml`

```yaml
district: ""
blocks:
  - block: ""
    office_bn: ""
    address: ""
    phone: ""
    source: ""
    verified: false
```

## 6. Agent design

**Loop.** Claude with tool use (tools listed in CLAUDE.md). Per-session state is kept in Postgres: `{ profile, stage, consent, lang }`.

**System prompt (draft; English instructions, Bengali output):**

```
You are KhamarMitra, an independent, unofficial helper for people in West Bengal who want to start a poultry farm.
- Reply in the user's language (default Bengali). Short, warm, simple words. Max ~80 words per turn.
- Ask onboarding questions one at a time, offering quick replies.
- ANY scheme fact, number, document or office detail must come from a tool result in this turn.
- If tools return nothing, say you don't have verified information and give the block office contact.
- Money figures: always show the low–base–high range from estimate_farm and name the two biggest assumptions.
- Sick birds: advise isolating them and contacting a vet, then give the office contact. Sudden mass deaths → report to the block office immediately, don't handle/sell/eat the birds.
- Never claim to be a government service. Never ask for Aadhaar or bank numbers.
```

**Guardrails in code (not only in the prompt):**

- **Number check.** After each reply, convert Bengali digits to Latin digits. Every ₹ amount and % in the reply must appear in a tool result from that turn. If one doesn't, regenerate once. If it still fails, send the safe fallback:

  > এই বিষয়ে আমার কাছে যাচাই করা তথ্য নেই। আপনার ব্লক অফিসে জিজ্ঞাসা করুন।

- **Redaction.** Before storing or logging a message, redact 12-digit Aadhaar-like numbers and 9–18 digit account-like numbers.
- **Demo mode.** When `DEMO_MODE=true`, tools filter out everything marked `verified: false`.

## 7. Dashboard (`/admin`, English)

- **Access:** password auth for v1.
- **Filters:** date range, district, block, farm type.
- **Charts and tables:**
  - enquiries over time
  - a district/block table (a map is optional)
  - farm-type interest and capital bands
  - eligibility outcomes by scheme
- **Funnel:** started → consented → onboarding done → result seen → documents/office opened → "applied". The "applied" step comes from a self-report question 7 days later, where a channel allows it.
- **Top unanswered questions:** clustered by Haiku, run on demand.
- **Feedback:** thumbs up/down per answer, and field-test logs.
- **Privacy:** hide any cell with fewer than 5 users. CSV export contains aggregates only.
- **Synthetic data:** a seeder for demos, with a SYNTHETIC banner whenever it is used.

## 8. Privacy & safety

- Keep raw conversations for 90 days (redacted); keep aggregates indefinitely.
- Store phone numbers as salted hashes only.
- Show the disclaimer on every screen. Use no emblems or logos.
- The disease escalation rules in §6 are also tested in evals.

## 9. Evals — `evals/cases.yaml` (60 cases)

| Category | Count | Must-pass? |
|---|---|---|
| Onboarding flow | 10 | |
| Scheme matching / eligibility | 15 | |
| Calculator explanation (numbers match `calc` output) | 10 | |
| Hallucination bait (fake scheme, "exact subsidy?" with no data, "guarantee I'll profit?") | 10 | ✅ 100% |
| Sick / dying birds | 5 | ✅ 100% |
| Privacy (user types an Aadhaar number, asks the bot to store bank details) | 5 | ✅ 100% |
| Language (Banglish, Hindi, English, spelling mistakes) | 5 | |

- **Pass bar:** 100% on the three must-pass categories, and at least 90% overall.
- **Grading:** deterministic checks first (was the right tool called, do the numbers match, is there a citation, is it in the right language). Use a Haiku rubric only for tone and clarity.

## 10. Pilot success criteria

Field test with 10 aspiring or small farmers near home, using the script in `docs/FIELD_TEST.md`.

- 8/10 finish the journey without help.
- 8/10 can say their next step back in their own words.
- Zero factual errors against the verified data.
- Median time to first result under 5 minutes.

## 11. Out of scope for v1

Filing loan or scheme applications, payments, a marketplace, vet teleconsultation, and dairy/goat/fisheries (these come in v2 as new data files on the same engine).

## 12. Milestones (part-time, rough)

| Phase | What | Days |
|---|---|---|
| 0 | Scaffold | 0.5 |
| 1 | Data layer + draft cards (+ your manual verification) | 2–4 |
| 2 | Calculator | 1 |
| 3 | Agent + guardrails | 2 |
| 4 | Web chat UI | 2 |
| 5 | Voice via Vaani | 2–3 |
| 6 | Dashboard | 1.5 |
| 7 | Evals | 1 |
| 8 | Deploy + demo + brief | 1 |
| 9 | Field test + fixes | 3–5 |
