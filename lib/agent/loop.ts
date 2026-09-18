import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, TOOL_LOOP_MAX_ITERATIONS } from "../config";
import type { UserProfile } from "../schemes/eligibility";
import { findUncitedFigures, SAFE_FALLBACK_BN } from "./guardrails";
import { SYSTEM_PROMPT } from "./prompt";
import { AGENT_TOOLS } from "./tools";
import {
  checkEligibilityHandler,
  estimateFarmHandler,
  findSchemesHandler,
  getDocumentsHandler,
  getOfficeHandler,
} from "./handlers";

/** The subset of the Anthropic SDK the loop needs — small enough to fake in tests. */
export interface AgentClient {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

export interface ToolCallRecord {
  name: string;
  input: unknown;
  output: unknown;
}

export interface AgentTurnResult {
  replyText: string;
  history: Anthropic.MessageParam[];
  toolCalls: ToolCallRecord[];
  profileUpdates: Partial<UserProfile>;
  hitFallback: boolean;
}

export interface RunAgentTurnOptions {
  client: AgentClient;
  onLogEvent?: (stage: string, data: Record<string, unknown>) => void;
  maxIterations?: number;
}

const PROFILE_KEYS: (keyof UserProfile)[] = [
  "age",
  "district",
  "block",
  "farm_type",
  "capital_band",
  "space_band",
  "prior_experience",
  "social_category",
  "gender",
];

function extractProfile(input: Record<string, unknown>): Partial<UserProfile> {
  const profile: Partial<UserProfile> = {};
  for (const key of PROFILE_KEYS) {
    if (input[key] !== undefined) (profile as Record<string, unknown>)[key] = input[key];
  }
  return profile;
}

function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  onLogEvent?: (stage: string, data: Record<string, unknown>) => void
): { output: unknown; profileFields: Partial<UserProfile> } {
  switch (name) {
    case "find_schemes": {
      const profile = extractProfile(input);
      return { output: findSchemesHandler(profile), profileFields: profile };
    }
    case "check_eligibility": {
      const profile = extractProfile(input);
      return { output: checkEligibilityHandler(String(input.scheme_id), profile), profileFields: profile };
    }
    case "estimate_farm": {
      const profileFields = input.capital_band ? { capital_band: String(input.capital_band) } : {};
      return {
        output: estimateFarmHandler(
          input.farm_type as never,
          typeof input.flock_size === "number" ? input.flock_size : undefined,
          typeof input.capital_band === "string" ? input.capital_band : undefined
        ),
        profileFields,
      };
    }
    case "get_documents":
      return { output: getDocumentsHandler(String(input.scheme_id)), profileFields: {} };
    case "get_office":
      return {
        output: getOfficeHandler(String(input.district), String(input.block)),
        profileFields: { district: String(input.district), block: String(input.block) },
      };
    case "log_event":
      onLogEvent?.(String(input.stage), (input.data as Record<string, unknown>) ?? {});
      return { output: { ok: true }, profileFields: {} };
    default:
      return { output: { error: `unknown tool ${name}` }, profileFields: {} };
  }
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/**
 * Runs one user turn through the tool-use loop: calls the model, executes
 * any tool_use blocks, feeds results back, and repeats until the model
 * stops asking for tools or the iteration cap (guardrail c) is hit. Applies
 * the number-check guardrail (a) to the final reply before returning it.
 */
export async function runAgentTurn(
  history: Anthropic.MessageParam[],
  userMessage: string,
  options: RunAgentTurnOptions
): Promise<AgentTurnResult> {
  const maxIterations = options.maxIterations ?? TOOL_LOOP_MAX_ITERATIONS;
  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: userMessage }];
  const toolCalls: ToolCallRecord[] = [];
  const profileUpdates: Partial<UserProfile> = {};
  let toolResultsText = "";

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await options.client.messages.create({
      model: MODELS.agent,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: AGENT_TOOLS,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const replyText = textOf(response);
      return finalizeReply(replyText, messages, toolCalls, profileUpdates, toolResultsText, options);
    }

    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    messages.push({ role: "assistant", content: response.content });

    const resultBlocks: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const { output, profileFields } = dispatchTool(block.name, block.input as Record<string, unknown>, options.onLogEvent);
      Object.assign(profileUpdates, profileFields);
      toolCalls.push({ name: block.name, input: block.input, output });
      const outputText = JSON.stringify(output);
      toolResultsText += outputText + "\n";
      resultBlocks.push({ type: "tool_result", tool_use_id: block.id, content: outputText });
    }
    messages.push({ role: "user", content: resultBlocks });
  }

  return {
    replyText: SAFE_FALLBACK_BN,
    history: messages,
    toolCalls,
    profileUpdates,
    hitFallback: true,
  };
}

async function finalizeReply(
  replyText: string,
  messages: Anthropic.MessageParam[],
  toolCalls: ToolCallRecord[],
  profileUpdates: Partial<UserProfile>,
  toolResultsText: string,
  options: RunAgentTurnOptions
): Promise<AgentTurnResult> {
  let finalText = replyText;
  let uncited = findUncitedFigures(finalText, toolResultsText);

  if (uncited.length > 0) {
    // Regenerate once, nudging the model to stick to tool-cited numbers.
    const retry = await options.client.messages.create({
      model: MODELS.agent,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: AGENT_TOOLS,
      messages: [
        ...messages,
        {
          role: "user",
          content:
            "Your last reply stated a number that wasn't in any tool result this turn. Reply again using only numbers that came from a tool result, or say you don't have verified information.",
        },
      ],
    });
    finalText = textOf(retry);
    uncited = findUncitedFigures(finalText, toolResultsText);
  }

  if (uncited.length > 0) {
    return { replyText: SAFE_FALLBACK_BN, history: [...messages, { role: "assistant", content: finalText }], toolCalls, profileUpdates, hitFallback: true };
  }

  return {
    replyText: finalText,
    history: [...messages, { role: "assistant", content: finalText }],
    toolCalls,
    profileUpdates,
    hitFallback: false,
  };
}
