import type { Page } from "@playwright/test";
import { seedArchive, STORAGE_KEY } from "./seed";

export async function polishSeed(page: Page, archive = seedArchive()) {
  await page.addInitScript(({ key, archive }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ state: { goals: archive.goals, active_goal_id: archive.active_goal_id }, version: 0 }));
  }, { key: STORAGE_KEY, archive });
  await page.route("**/api/**", (route) => route.request().url().endsWith("/api/health")
    ? route.fulfill({ json: { ok: true, serverKey: true, provider: "openai", mode: "replay", models: { fast: "audit", smart: "audit" } } })
    : route.fulfill({ status: 503, json: { error: "Connection interrupted" } }));
}
export const saved = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state, STORAGE_KEY);
