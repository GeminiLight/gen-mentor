import { expect, test } from "@playwright/test";
import sample from "../fixtures/agents/sample.json" with { type: "json" };
import { seed, STORAGE_KEY } from "./seed";

/**
 * No blank waits. Every agent call is slowed to two seconds here; within 200 ms of the
 * trigger the page must already show a skeleton, a stage list or an optimistic state.
 */
const SLOW_MS = 2000;
const BUDGET_MS = 200;

async function slowApi(page: import("@playwright/test").Page) {
  await page.route("**/api/**", async (route) => {
    if (route.request().url().endsWith("/api/health")) return route.continue();
    await new Promise((r) => setTimeout(r, SLOW_MS));
    await route.continue();
  });
}

test("onboarding shows the stage list immediately after submit", async ({ page }) => {
  await slowApi(page);
  await page.goto("/onboarding");
  await page.getByLabel("Where do you want to be?").fill(sample.learning_goal);
  await page.getByLabel("Your background").fill(sample.learner_information);
  const t0 = Date.now();
  await page.getByRole("button", { name: "Build my path" }).click();
  await expect(page.getByText("Refining your goal into something a path can be built against")).toBeVisible({ timeout: BUDGET_MS });
  expect(Date.now() - t0).toBeLessThan(BUDGET_MS + 100);
});

test("opening an ungenerated session shows the pipeline panel at once", async ({ page }) => {
  await seed(page);
  await slowApi(page);
  await page.goto("/session/1");
  await expect(page.locator("[data-loading]").first()).toBeVisible({ timeout: BUDGET_MS + 300 });
  await expect(page.getByText("Exploring the knowledge points this session needs")).toBeVisible({ timeout: BUDGET_MS });
});

test("reschedule shows streaming state before the model answers", async ({ page }) => {
  await seed(page);
  await slowApi(page);
  await page.goto("/learning-path");
  await page.getByRole("button", { name: "Reschedule" }).click();
  const t0 = Date.now();
  await page.getByRole("dialog").getByRole("button", { name: "Reschedule" }).click();
  await expect(page.getByRole("dialog").locator("[data-loading]")).toBeVisible({ timeout: BUDGET_MS });
  expect(Date.now() - t0).toBeLessThan(BUDGET_MS + 100);
});

test("pages render skeletons before the archive hydrates", async ({ page }) => {
  // Freeze hydration by making localStorage reads slow to observe: navigate with JS coverage of the
  // very first paint. A skeleton must exist in the server-rendered HTML.
  await page.addInitScript((k) => window.localStorage.setItem(k, JSON.stringify({ state: { goals: [], active_goal_id: null }, version: 0 })), STORAGE_KEY);
  const html = await (await page.request.get("/learning-path")).text();
  expect(html).toContain("data-loading");
});

test("tutor shows the pending bubble the moment a message is sent", async ({ page }) => {
  await seed(page);
  await slowApi(page);
  await page.goto("/learning-path");
  await page.getByRole("button", { name: "Open AI tutor" }).first().click();
  await page.getByLabel("Message to the tutor").fill("Hello");
  const t0 = Date.now();
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("tutor-messages").locator("[aria-busy=true]")).toBeVisible({ timeout: BUDGET_MS });
  expect(Date.now() - t0).toBeLessThan(BUDGET_MS + 100);
});
