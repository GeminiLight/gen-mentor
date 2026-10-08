import type { Page } from "@playwright/test";
import { STORAGE_KEY, seedArchive } from "../fixtures/archive";
export { STORAGE_KEY, GOAL_ID, seedArchive } from "../fixtures/archive";

/** Put the seeded archive into localStorage before the first navigation. zustand persist wraps it. */
export async function seed(page: Page) {
  await page.addInitScript(
    ([key, archive]) => {
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, JSON.stringify({ state: { goals: archive.goals, active_goal_id: archive.active_goal_id }, version: 0 }));
      }
    },
    [STORAGE_KEY, seedArchive()] as const,
  );
}
