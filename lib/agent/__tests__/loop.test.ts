import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgentTurn, type AgentClient } from "../loop";
import { SAFE_FALLBACK_BN } from "../guardrails";

function textMessage(text: string): Anthropic.Message {
  return {
    id: "msg",
    type: "message",
    role: "assistant",
    model: "test",
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {} as never,
  } as unknown as Anthropic.Message;
}

function toolUseMessage(name: string, input: Record<string, unknown>, id = "tool_1"): Anthropic.Message {
  return {
    id: "msg",
    type: "message",
    role: "assistant",
    model: "test",
    content: [{ type: "tool_use", id, name, input }],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: {} as never,
  } as unknown as Anthropic.Message;
}

function fakeClient(responses: Anthropic.Message[]): AgentClient {
  const create = vi.fn();
  for (const r of responses) create.mockResolvedValueOnce(r);
  return { messages: { create } };
}

describe("runAgentTurn", () => {
  it("executes a tool call, then returns the model's final (uncited-number-free) reply", async () => {
    const client = fakeClient([
      toolUseMessage("get_office", { district: "Jhargram", block: "Jhargram" }),
      textMessage("আপনার ব্লক অফিসে যোগাযোগ করুন।"),
    ]);
    const result = await runAgentTurn([], "block office কোথায়?", { client });

    expect(result.hitFallback).toBe(false);
    expect(result.replyText).toBe("আপনার ব্লক অফিসে যোগাযোগ করুন।");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe("get_office");
    expect(result.profileUpdates).toMatchObject({ district: "Jhargram", block: "Jhargram" });
  });

  it("regenerates once when the reply states a number no tool result gave it, then accepts a clean retry", async () => {
    const client = fakeClient([
      textMessage("ভর্তুকি ৯৯% পাবেন।"), // no tools called, so nothing backs "99"
      textMessage("এই বিষয়ে আমার কাছে যাচাই করা তথ্য নেই।"),
    ]);
    const result = await runAgentTurn([], "কত ভর্তুকি পাবো?", { client });

    expect(client.messages.create).toHaveBeenCalledTimes(2);
    expect(result.hitFallback).toBe(false);
    expect(result.replyText).toBe("এই বিষয়ে আমার কাছে যাচাই করা তথ্য নেই।");
  });

  it("falls back to the safe message when the retry still states an uncited number", async () => {
    const client = fakeClient([textMessage("৯৯% ভর্তুকি।"), textMessage("তাহলে ৯৯% ভর্তুকি পাবেন।")]);
    const result = await runAgentTurn([], "কত ভর্তুকি?", { client });

    expect(result.hitFallback).toBe(true);
    expect(result.replyText).toBe(SAFE_FALLBACK_BN);
  });

  it("caps the tool loop and falls back rather than looping forever", async () => {
    const client = fakeClient([
      toolUseMessage("log_event", { stage: "x" }, "a"),
      toolUseMessage("log_event", { stage: "y" }, "b"),
      toolUseMessage("log_event", { stage: "z" }, "c"),
    ]);
    const result = await runAgentTurn([], "hi", { client, maxIterations: 3 });

    expect(result.hitFallback).toBe(true);
    expect(result.replyText).toBe(SAFE_FALLBACK_BN);
    expect(client.messages.create).toHaveBeenCalledTimes(3);
  });

  it("routes log_event tool calls to the onLogEvent callback without exposing them as chat content", async () => {
    const onLogEvent = vi.fn();
    const client = fakeClient([toolUseMessage("log_event", { stage: "consented", data: { lang: "bn" } }), textMessage("ঠিক আছে।")]);
    await runAgentTurn([], "রাজি", { client, onLogEvent });

    expect(onLogEvent).toHaveBeenCalledWith("consented", { lang: "bn" });
  });
});
