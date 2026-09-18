"use client";

import { useRef, useState } from "react";
import {
  CONSENT_NO_BN,
  CONSENT_QUESTION_BN,
  CONSENT_YES_BN,
  DISCLAIMER_BN,
  MY_PLAN_BN,
  TALK_TO_PERSON_BN,
} from "@/lib/agent/copy";
import { parseQuickReplies } from "@/lib/client/quickReplies";
import { readSseStream } from "@/lib/client/sse";
import { FindSchemesCard, EstimateFarmCard, GetDocumentsCard, GetOfficeCard } from "./ResultCard";
import type { FindSchemesResult, EstimateFarmResult, GetDocumentsResult, GetOfficeResult } from "@/lib/agent/handlers";

interface ToolCallView {
  name: string;
  output: unknown;
}

interface ChatMessage {
  id: number;
  role: "bot" | "user";
  text: string;
  toolCalls?: ToolCallView[];
}

type ConsentState = "pending" | "given" | "declined";

// SpeechRecognition isn't in the standard DOM lib yet — declared loosely so the mic button degrades gracefully where it's missing.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null;
  onend: (() => void) | null;
  start(): void;
};

function ToolResults({ toolCalls }: { toolCalls?: ToolCallView[] }) {
  if (!toolCalls) return null;
  return (
    <>
      {toolCalls.map((call, i) => {
        if (call.name === "find_schemes") return <FindSchemesCard key={i} result={call.output as FindSchemesResult} />;
        if (call.name === "estimate_farm") return <EstimateFarmCard key={i} result={call.output as EstimateFarmResult} />;
        if (call.name === "get_documents") return <GetDocumentsCard key={i} result={call.output as GetDocumentsResult} />;
        if (call.name === "get_office") return <GetOfficeCard key={i} result={call.output as GetOfficeResult} />;
        return null;
      })}
    </>
  );
}

export default function Chat() {
  const [consent, setConsent] = useState<ConsentState>("pending");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "bot",
      text: `${DISCLAIMER_BN}\n\n${CONSENT_QUESTION_BN} [${CONSENT_YES_BN}] [${CONSENT_NO_BN}]`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const nextId = useRef(1);
  const sessionId = useRef<string | undefined>(undefined);
  const clientHistory = useRef<unknown[]>([]);

  async function sendToAgent(text: string, { showUserBubble = true } = {}) {
    const consented = consent === "given";
    if (showUserBubble) {
      setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text }]);
    }
    setSending(true);
    const botMessageId = nextId.current++;
    setMessages((prev) => [...prev, { id: botMessageId, role: "bot", text: "" }]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          consent: consented,
          session_id: sessionId.current,
          history: consented ? undefined : clientHistory.current,
        }),
      });
      if (!res.body) throw new Error("no response body");

      for await (const evt of readSseStream(res.body)) {
        if (evt.event === "chunk") {
          const piece = evt.data as string;
          setMessages((prev) => prev.map((m) => (m.id === botMessageId ? { ...m, text: m.text + piece } : m)));
        } else if (evt.event === "done") {
          const done = evt.data as { sessionId?: string; history?: unknown[]; toolCalls?: ToolCallView[] };
          if (done.sessionId) sessionId.current = done.sessionId;
          if (done.history) clientHistory.current = done.history;
          setMessages((prev) => prev.map((m) => (m.id === botMessageId ? { ...m, toolCalls: done.toolCalls } : m)));
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === botMessageId ? { ...m, text: "সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।" } : m))
      );
    } finally {
      setSending(false);
    }
  }

  function handleConsent(choice: string) {
    const given = choice === CONSENT_YES_BN;
    setConsent(given ? "given" : "declined");
    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text: choice }]);
    void sendToAgent("নমস্কার", { showUserBubble: false });
  }

  function handleSend(text: string) {
    if (!text.trim() || sending) return;
    setInput("");
    void sendToAgent(text.trim());
  }

  function handleMic() {
    const SpeechRecognitionCtor = (
      window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    ).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "bn-IN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  function handleSharePlan() {
    const summary = messages
      .filter((m) => m.role === "bot" && m.text)
      .map((m) => m.text)
      .join("\n\n");
    const url = `https://wa.me/?text=${encodeURIComponent(summary.slice(0, 3500))}`;
    window.open(url, "_blank");
  }

  return (
    <div className="flex h-dvh flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 text-center">
        <h1 className="text-lg font-semibold">খামারমিত্র</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.map((m) => (
          <div key={m.id} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={m.role === "user" ? "max-w-[85%]" : "max-w-[90%]"}>
              <div
                data-testid={m.role === "user" ? "user-message" : "bot-message"}
                className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-blue-600 text-white" : "bg-white text-neutral-900 shadow-sm"
                }`}
              >
                {m.text || (sending && m.role === "bot" ? "…" : "")}
              </div>
              {m.role === "bot" && <ToolResults toolCalls={m.toolCalls} />}
              {m.role === "bot" && m.text && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {parseQuickReplies(m.text).map((option) => (
                    <button
                      key={option}
                      onClick={() => (consent === "pending" ? handleConsent(option) : handleSend(option))}
                      disabled={sending}
                      className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs text-blue-800 active:bg-blue-100 disabled:opacity-50"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {consent !== "pending" && (
        <div className="flex gap-2 overflow-x-auto border-t border-neutral-200 bg-white px-3 py-2 text-xs">
          <button onClick={() => handleSend(TALK_TO_PERSON_BN)} disabled={sending} className="whitespace-nowrap rounded-full border border-neutral-300 px-3 py-1 text-neutral-700">
            {TALK_TO_PERSON_BN}
          </button>
          <button onClick={handleSharePlan} className="whitespace-nowrap rounded-full border border-neutral-300 px-3 py-1 text-neutral-700">
            {MY_PLAN_BN}
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex items-center gap-2 border-t border-neutral-200 bg-white px-3 py-2"
      >
        <button
          type="button"
          onClick={handleMic}
          aria-label="voice input"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${listening ? "border-red-400 text-red-600" : "border-neutral-300 text-neutral-600"}`}
        >
          🎤
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="লিখুন..."
          disabled={consent === "pending" || sending}
          className="flex-1 rounded-full border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
        />
        <button
          type="submit"
          disabled={consent === "pending" || sending || !input.trim()}
          className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          পাঠান
        </button>
      </form>
    </div>
  );
}
