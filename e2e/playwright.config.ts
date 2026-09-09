import { defineConfig, devices } from "@playwright/test";

/**
 * The app is started by scripts/verify-ui.sh (or by you) before this runs;
 * BASE_URL points at it. Screenshots land in artifacts/screenshots and are
 * checked for coverage by the same script.
 */
export default defineConfig({
  testDir: "./specs",
  outputDir: "./artifacts/test-results",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "./artifacts/report", open: "never" }]],
  timeout: 60_000,
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
