import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Some sandboxes pre-install Chromium at a fixed path instead of Playwright's
// usual cache location. Use it only if it's actually there, so this config
// still works unmodified on a normal dev machine or CI.
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3000",
    ...(existsSync(SANDBOX_CHROMIUM) ? { launchOptions: { executablePath: SANDBOX_CHROMIUM } } : {}),
  },
});
