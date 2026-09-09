import type { Page } from "@playwright/test";

/**
 * Wait until the page is visually stable: loaded, fonts ready, and any element marked
 * `data-loading` gone. `networkidle` is avoided on purpose: a long-lived connection
 * (streams, keep-alive) makes it hang for the whole timeout.
 */
export async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);
  await page.locator("[data-loading]").waitFor({ state: "detached", timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(150);
}
