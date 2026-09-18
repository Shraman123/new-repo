import { test, expect } from "@playwright/test";

function sseBody(...events: { event: string; data: unknown }[]): string {
  return events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join("");
}

// Mocks /api/agent so this runs without ANTHROPIC_API_KEY/DATABASE_URL — it
// exercises the chat UI's wiring (consent, streaming, quick replies), not
// the live model. See docs/DECISIONS.md.
test("happy path: consent, streamed reply, tapping a quick reply", async ({ page }) => {
  await page.route("**/api/agent", async (route) => {
    const body = sseBody(
      { event: "chunk", data: "স্বাগতম! আপনি কোন জেলায় থাকেন? [ঝাড়গ্রাম] [অন্য জেলা]" },
      { event: "done", data: { toolCalls: [] } }
    );
    await route.fulfill({ status: 200, contentType: "text/event-stream", body });
  });

  await page.goto("/");

  await expect(page.getByText(/সরকারি পরিষেবা নয়/)).toBeVisible();
  await page.getByRole("button", { name: "হ্যাঁ, রাজি" }).click();

  await expect(page.getByText(/আপনি কোন জেলায় থাকেন/)).toBeVisible();
  await page.getByRole("button", { name: "ঝাড়গ্রাম" }).click();

  await expect(page.getByTestId("user-message").last()).toHaveText("ঝাড়গ্রাম");
});
