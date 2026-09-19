import { describe, expect, it } from "vitest";
import { buildSystemPrompt, SYSTEM_PROMPT } from "../prompt";
import { VOICE_MAX_SPOKEN_TURNS, VOICE_MESSAGE_WORD_LIMIT } from "../../config";

describe("buildSystemPrompt", () => {
  it("defaults to the web prompt, which allows bracket quick replies", () => {
    expect(buildSystemPrompt()).toBe(SYSTEM_PROMPT);
    expect(buildSystemPrompt("web")).toContain("square brackets");
  });

  it("the voice prompt forbids brackets and caps turns/words for a caller", () => {
    const voice = buildSystemPrompt("voice");
    expect(voice).toContain("Never use square brackets");
    expect(voice).toContain(`${VOICE_MAX_SPOKEN_TURNS} short spoken turns`);
    expect(voice).toContain(`${VOICE_MESSAGE_WORD_LIMIT} words`);
  });

  it("every channel keeps the shared safety rules (no invented numbers, no antibiotics, no Aadhaar)", () => {
    for (const channel of ["web", "voice", "whatsapp"] as const) {
      const prompt = buildSystemPrompt(channel);
      expect(prompt).toContain("MUST come from a tool result");
      expect(prompt).toContain("Do not name antibiotics");
      expect(prompt).toContain("Never ask for or store Aadhaar");
    }
  });
});
