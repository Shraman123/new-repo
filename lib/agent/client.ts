import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

/** Lazily creates the real Anthropic client so importing this module never requires ANTHROPIC_API_KEY (e.g. in tests). */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set (see .env.example)");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}
