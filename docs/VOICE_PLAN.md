# Voice via Vaani — plan

Phase 5 per PROMPTS.md: study `github.com/Shraman123/AI-Call-Centre` ("Vaani"),
then plan the voice channel here.

**Status: implemented.** The plan below was written and approved first;
implementation then went into `github.com/Shraman123/AI-Call-Centre` on a
`khamarmitra-voice` branch (pushed — see that repo's README.md for what it
does and, importantly, the list of things still unverified against real
Exotel/Sarvam accounts, since none exist in this environment). This repo's
own `/api/agent` change (the `channel` field and the voice system prompt)
is already merged into the branch this was built on — see docs/DECISIONS.md's
Phase 5 entries.

## What Vaani actually is

Cloned to `/home/user/shraman123/ai-call-centre` (read-only) and read in full —
it's small: `backend/main.py` (the whole pipeline), `backend/agi_server.py`
(the Asterisk listener), `asterisk_config/*.conf`, and a React dashboard.

Call flow: **Asterisk PBX** (self-hosted SIP server) answers, dials into
`AGI(agi://localhost:4573/ai-agent)`, which hands the call to
`CallHandler.handle_call()` in `main.py`. That loop is:

1. Speak a hardcoded English welcome line via `pyttsx3`.
2. `agi.record_file(...)` — **blocking**, records to a fixed `.wav` until
   silence/timeout.
3. Transcribe the recording with local **Whisper** (`base` model).
4. Send the transcript + a 5-turn rolling history to a local **Ollama
   llama2** model with a generic customer-service system prompt.
5. Speak the reply with `pyttsx3`, loop back to step 2.
6. A Postgres-via-SQLAlchemy `call_logs` table plus Redis (for a live
   WebSocket dashboard) log each call.

Everything runs on one Ubuntu box: Asterisk, Redis, a local Postgres/SQLite,
Whisper, and Ollama, all offline and free. There's no telephony *provider* —
`asterisk_config/sip.conf` only defines a local SIP softphone account for
testing (`secret=password123`); nothing here reaches a real PSTN number.
There's no missed-call/callback logic (it only answers inbound SIP calls
live), no language detection or bn-IN handling anywhere, and no SMS/WhatsApp
step.

**What's reusable:** the *shape* of the loop (greet → listen → transcribe →
LLM → speak → repeat, with a call log). **What isn't:** the specific stack.
Whisper `base` and `pyttsx3` (which shells out to `espeak-ng` on Linux) are
both weak-to-unusable for Bengali — `espeak-ng`'s Bengali voice is a
robotic last resort, not something to put in front of a first-time farmer —
and Asterisk needs a real SIP trunk from a telephony provider to reach an
actual phone number, which this repo doesn't set up.

## 1. Missed-call → callback flow

**Provider: Exotel.** It's the Indian cloud-telephony incumbent built for
exactly this shape (vernacular-first, DPDP-aware, India data residency),
and — unlike Asterisk-DIY — it gives a documented path to plug in our own
STT/LLM/TTS over a real number without us running SIP infrastructure:

- **AgentStream / Voicebot Applet**: a bidirectional WebSocket
  (`wss://`) that streams base64 linear-PCM audio to our endpoint in
  ~100ms frames and lets our endpoint stream audio back (with barge-in) —
  Exotel does *not* do STT/TTS itself, which is what we want since we're
  bringing our own bn-IN models.
- **Make-a-Call API** to originate the callback leg.
- A missed call on a rented Exotel virtual number (an "ExoPhone") fires a
  webhook we can catch to trigger the callback — the caller is never
  charged (standard "give a missed call" pattern in India), and neither
  are we for a call nobody answers.

Flow: farmer gives a missed call to the published KhamarMitra number →
Exotel webhooks our backend → we call `POST /make-a-call` to ring them back
→ Exotel opens the AgentStream WebSocket to our voice bridge for that leg.

**What number to use:** a single rented ExoPhone (virtual number), shown on
every screen next to the disclaimer and given out at the pilot's field
tests — not a number tied to any personal phone.

**Costs (need a real quote before committing, but as a planning order of
magnitude):** cloud-telephony platforms in this class run roughly
₹500–1,500/user/month for core IVR+voice, ₹1,500–3,000+/month once AI/
streaming features are involved; Exotel's own missed-call product has been
quoted around ₹5,000/month for a bundle of 2 lakh missed calls, and
outbound/streaming minutes are billed per-minute on top. For a pilot
(tens to low hundreds of calls), expect a small monthly platform fee plus
low-single-digit-₹-per-minute for the callback leg — get Exotel's actual
quote for AgentStream + a callback flow before Phase 5 implementation
starts; don't build a cost model around the numbers above.

**Alternatives if Exotel doesn't work out:** Ozonetel and Knowlarity offer
similar CCaaS+telephony bundles (enterprise-sales-quote pricing); Plivo and
Twilio have India numbers and programmable voice but are less
vernacular-focused and, for Twilio, typically pricier for Indian traffic.
Worth a short bake-off (a test ExoPhone + one competitor) before signing
anything.

## 2. bn-IN in the STT/TTS pipeline

Replace Whisper+pyttsx3 with **Sarvam AI**, which is purpose-built for
Indian languages and explicitly handles Bengali including Banglish
("Benglish") code-mixing — directly relevant, since CLAUDE.md already
treats Banglish as Bengali for the text channel:

- **STT** — Sarvam's Saaras v3 model, live/streaming transcription with
  speaker diarization; priced around ₹1.5/minute after a free credit
  allowance.
- **TTS** — Sarvam's Bulbul v3 model, described as handling Bengali
  conjunct consonants and Benglish; priced around ₹30 per 10,000
  characters after a free credit allowance.

**Lower-cost / fallback option:** Bhasini (Government of India's Digital
Public Infrastructure for Indian Languages) offers ASR/TTS for 22
scheduled languages, free for non-commercial use and discounted for
commercial use — worth evaluating as a cost-reduction path once volume
grows, or as a fallback if Sarvam has an outage, though its production
reliability/SLA for a live phone call needs its own check before relying
on it.

Both of the above need their own API-key sign-up and a real quality check
against real farmer speech (accents, background noise, phone-line audio
quality) before Phase 5 implementation — don't commit to per-minute
pricing without testing actual transcription accuracy on West Bengal
rural-accent Bengali first.

## 3. Each voice turn calls `POST /api/agent` with `channel=voice`

Architecture (extends CLAUDE.md's existing one — voice stays a thin
adapter over the same endpoint, not a separate agent):

```
Farmer's missed call
   │
   ▼
Exotel (ExoPhone, Make-a-Call, AgentStream WebSocket)
   │  wss:// PCM audio frames
   ▼
Voice bridge (new small always-on service — NOT a Vercel function; a
WebSocket needs a persistent process, so this deploys separately, e.g.
Fly.io/Render, mirroring how Vaani's agi_server.py is a persistent
asyncio server)
   │  1. buffer audio until an end-of-utterance (silence/VAD)
   │  2. Sarvam STT → Bengali/Banglish/Hindi/English text
   │  3. POST /api/agent  { message, session_id, consent, channel: "voice" }
   │  4. Sarvam TTS on the reply text
   │  5. stream the synthesized audio back over the same WebSocket
   ▼
Exotel plays it to the caller; loop until hangup or goodbye
```

**Two concrete changes this implies for the existing `/api/agent` route**
(to make in Phase 5's implementation step, not now):

- Add `channel: z.enum(["web", "voice", "whatsapp"]).default("web")` to
  `RequestSchema` in `app/api/agent/route.ts`, and thread it into
  `lib/agent/loop.ts` / the system prompt.
- On `channel === "voice"`, the system prompt needs a tighter budget than
  the text channel's ~80 words: PROMPTS.md calls for **≤2 short spoken
  turns per exchange** — i.e. the model should say less per turn and ask
  one thing at a time even more strictly than it already does for text,
  since a caller can't re-read a long sentence. Concretely: a lower word
  cap (e.g. ~25–30 words per spoken turn) and no `[bracket]` quick-reply
  syntax (that's a web-only affordance) — the voice bridge instead offers
  choices verbally ("বলুন ১ নম্বরের জন্য... বা ২ নম্বরের জন্য...") or just
  takes free speech.
- The guardrails (number-check, redaction, iteration cap) apply unchanged
  — they operate on the reply text regardless of channel.

Session continuity: the voice bridge is the piece that knows the caller's
phone number (from Exotel's webhook payload) and must ask for/confirm
consent verbally at call start per CLAUDE.md rule 7 before creating a
session — same consent-then-persist rule as the web chat, just asked out
loud instead of via UI buttons.

## 4. Sending the full plan by SMS/WhatsApp after the call

**WhatsApp first.** Unlike SMS, WhatsApp Business API in India needs no
DLT (Distributed Ledger Technology, TRAI's telemarketing registry)
registration — SMS to Indian numbers legally requires DLT entity+template
registration with a telecom operator portal, which is slow, bureaucratic
setup we'd rather avoid for a pilot. Exotel is itself a Meta Tech Provider/BSP for WhatsApp, so the
same vendor can carry both the call and the follow-up message without
adding a third party. Indian marketing-template pricing is roughly
US$0.01–0.02/message; a reply within a user-initiated 24-hour session is
free.

**Practically:** at the end of a voice call (or when the farmer says
"আমার পরিকল্পনা" on the web channel — already wired in Phase 4), the
agent turn that produces the summary sends it as a WhatsApp template
message to the caller's number (already known from the call). SMS stays a
fallback only for a caller with no WhatsApp — accept the DLT overhead
later if pilot feedback shows real demand for it.

## 5. Failure cases

- **Silence:** if the voice bridge's VAD gets no speech for ~5s after a
  prompt, replay a shorter re-prompt once ("আপনি কি এখনও আছেন?"); a second
  silence ends the call politely and, if a phone number was captured,
  sends a WhatsApp follow-up with the office contact so the farmer isn't
  left stranded.
- **Noise / low-confidence transcription:** Sarvam STT should expose a
  confidence signal; below a threshold, don't guess — ask the farmer to
  repeat ("দুঃখিত, ভালো শোনা যায়নি, আবার বলুন") rather than feeding a
  garbled transcript into the agent (which could otherwise produce a
  confused reply or, worse, misfire a tool call).
- **Mid-call language switch:** since a phone call has no visible
  "[quick reply]" affordance, language switching relies entirely on the
  STT's language detection per utterance. Detect it per-turn (not once at
  call start) and pass it through so the agent's existing "reply in the
  user's language" instruction (CLAUDE.md rule 4) keeps working turn by
  turn — same behaviour as text, just detected from speech instead of
  script.
- **Call drops / network failure mid-conversation:** treat it like a
  browser tab closing on the web channel — the session and its history are
  already persisted after every turn (once consent is given), so a
  callback or a fresh call from the same number can resume rather than
  restart from scratch. Exotel's status-callback webhook should mark the
  session's stage accordingly.

## Open questions for you before implementation

1. Confirm Exotel (vs. a competitor) after getting an actual quote for
   AgentStream + missed-call + a rented ExoPhone.
2. Sign up for Sarvam AI API keys and sanity-check STT accuracy against a
   few real West Bengal rural-accent Bengali voice samples before relying
   on it live.
3. Decide the SMS fallback's DLT registration is worth doing now or
   deferred past the pilot.
4. Where the voice bridge service actually deploys (Fly.io/Render/a small
   VPS) — it can't be a Vercel serverless function because of the
   persistent WebSocket.

---

Implemented on `khamarmitra-voice` in `github.com/Shraman123/AI-Call-Centre`.
Open questions 1-4 above are still genuinely open — they need a live Exotel
account, a live Sarvam AI key, and a real test call, none of which exist in
this environment. Nothing here should be treated as "confirmed working"
until those are checked.
