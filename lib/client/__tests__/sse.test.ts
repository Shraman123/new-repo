import { describe, expect, it } from "vitest";
import { readSseStream } from "../sse";

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
}

describe("readSseStream", () => {
  it("parses events split across multiple underlying chunks", async () => {
    const body = streamFrom(['event: chunk\ndata: "hel', 'lo"\n\n', 'event: done\ndata: {"ok":true}\n\n']);
    const events = [];
    for await (const e of readSseStream(body)) events.push(e);

    expect(events).toEqual([
      { event: "chunk", data: "hello" },
      { event: "done", data: { ok: true } },
    ]);
  });
});
