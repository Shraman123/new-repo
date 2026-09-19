export const MODELS = {
  agent: "claude-sonnet-5",
  cheap: "claude-haiku-4-5-20251001",
} as const;

export const CHAT_MESSAGE_WORD_LIMIT = 80;

// A caller can't re-read a long sentence, so the voice channel gets a
// tighter budget than text (PROMPTS.md Phase 5: "≤2 short spoken turns
// per exchange").
export const VOICE_MESSAGE_WORD_LIMIT = 30;
export const VOICE_MAX_SPOKEN_TURNS = 2;

export const TOOL_LOOP_MAX_ITERATIONS = 6;

export const DEMO_MODE = process.env.DEMO_MODE === "true";

export const RAW_CONVERSATION_RETENTION_DAYS = 90;

export const DASHBOARD_MIN_GROUP_SIZE = 5;
