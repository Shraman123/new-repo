export const MODELS = {
  agent: "claude-sonnet-5",
  cheap: "claude-haiku-4-5-20251001",
} as const;

export const CHAT_MESSAGE_WORD_LIMIT = 80;

export const TOOL_LOOP_MAX_ITERATIONS = 6;

export const DEMO_MODE = process.env.DEMO_MODE === "true";

export const RAW_CONVERSATION_RETENTION_DAYS = 90;

export const DASHBOARD_MIN_GROUP_SIZE = 5;
