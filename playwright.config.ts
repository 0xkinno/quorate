import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  workers: 2,
  reporter: [["list"]],
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100", browserName: "chromium" },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npx next start -p 3100", port: 3100, reuseExistingServer: true, timeout: 120_000 },
});
