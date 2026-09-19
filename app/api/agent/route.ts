import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "../../../lib/agent/client";
import { redactSensitiveNumbers } from "../../../lib/agent/guardrails";
import { runAgentTurn } from "../../../lib/agent/loop";
import { logEvent } from "../../../lib/db/events";
import { createSession, getSession, saveSessionTurn } from "../../../lib/db/sessions";

// Every channel (web chat, voice, WhatsApp) is a thin adapter over this one endpoint (CLAUDE.md architecture).
const RequestSchema = z.object({
  session_id: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
  consent: z.boolean().optional(),
  lang: z.string().optional(),
  channel: z.enum(["web", "voice", "whatsapp"]).default("web"),
  // Only used when consent is false/absent: the client keeps its own
  // history, since we store nothing server-side without consent.
  history: z.array(z.record(z.string(), z.unknown())).optional(),
});

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }

  const consented = body.consent === true;
  const redactedMessage = redactSensitiveNumbers(body.message);

  let sessionId: string | undefined = body.session_id;
  let history = (body.history as Anthropic.MessageParam[] | undefined) ?? [];
  let existingProfile: Record<string, unknown> = {};
  let dbAvailable = true;

  if (consented) {
    try {
      if (sessionId) {
        const row = await getSession(sessionId);
        if (row) {
          history = row.history as Anthropic.MessageParam[];
          existingProfile = row.profile as Record<string, unknown>;
        } else {
          sessionId = undefined;
        }
      }
      if (!sessionId) {
        const row = await createSession(body.lang ?? "bn");
        sessionId = row.id;
      }
    } catch (err) {
      console.error("session storage unavailable, continuing without persistence", err);
      dbAvailable = false;
    }
  }

  const canLog = consented && dbAvailable && sessionId !== undefined;
  const result = await runAgentTurn(history, redactedMessage, {
    client: getAnthropicClient(),
    onLogEvent: canLog ? (stage, data) => void logEvent(sessionId!, stage, data) : undefined,
    channel: body.channel,
  });

  if (consented && dbAvailable && sessionId) {
    try {
      await saveSessionTurn(sessionId, {
        history: result.history,
        profile: { ...existingProfile, ...result.profileUpdates },
        stage: result.hitFallback ? "fallback" : "chatting",
        consent: true,
      });
    } catch (err) {
      console.error("failed to persist session turn", err);
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      // Word-chunked for a progressive feel; the underlying model call
      // already completed above (see lib/agent/loop.ts for why: the
      // number-check guardrail needs the full reply before it can ship).
      for (const word of result.replyText.split(/(\s+)/)) {
        controller.enqueue(encoder.encode(sseEvent("chunk", word)));
      }
      controller.enqueue(
        encoder.encode(
          sseEvent("done", {
            sessionId: consented ? sessionId : undefined,
            history: consented ? undefined : result.history,
            toolCalls: result.toolCalls.filter((t) => t.name !== "log_event").map((t) => ({ name: t.name, output: t.output })),
          })
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
