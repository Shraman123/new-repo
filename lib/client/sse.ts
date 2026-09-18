export interface SseEvent {
  event: string;
  data: unknown;
}

/** Parses the "event: x\ndata: y\n\n" stream our /api/agent route emits and yields each event as it arrives. */
export async function* readSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      const eventLine = chunk.split("\n").find((l) => l.startsWith("event: "));
      const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!eventLine || !dataLine) continue;
      yield { event: eventLine.slice("event: ".length), data: JSON.parse(dataLine.slice("data: ".length)) };
    }
  }
}
