import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Chat from "../Chat";
import { CONSENT_NO_BN, CONSENT_YES_BN } from "@/lib/agent/copy";

function sseResponse(events: { event: string; data: unknown }[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) {
        controller.enqueue(encoder.encode(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(body);
}

describe("Chat", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the disclaimer and consent quick replies before anything else", () => {
    render(<Chat />);
    expect(screen.getByText(/সরকারি পরিষেবা নয়/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CONSENT_YES_BN })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CONSENT_NO_BN })).toBeInTheDocument();
  });

  it("declining consent still talks to the agent, with consent:false in the request", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { event: "chunk", data: "ঠিক আছে, শুরু করা যাক।" },
        { event: "done", data: { toolCalls: [] } },
      ])
    );

    render(<Chat />);
    fireEvent.click(screen.getByRole("button", { name: CONSENT_NO_BN }));

    await waitFor(() => expect(screen.getByText("ঠিক আছে, শুরু করা যাক।")).toBeInTheDocument());

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent",
      expect.objectContaining({
        body: expect.stringContaining('"consent":false'),
      })
    );
  });
});
