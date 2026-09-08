import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { discoverRoutes, slugOf, THEMES, VIEWPORTS } from "./routes";
import { settle } from "./settle";

const OUT = resolve(import.meta.dirname, "..", "artifacts", "screenshots");
mkdirSync(OUT, { recursive: true });

/**
 * Evidence, not assertions: one PNG per page × viewport × theme. verify-ui.sh checks
 * that every route discovered from the file system has all six and none is blank.
 */
for (const route of discoverRoutes()) {
  for (const [vp, size] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      test(`${route} @ ${vp} ${theme}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.addInitScript((t) => window.localStorage.setItem("theme", t), theme);
        const res = await page.goto(route);
        expect(res?.ok(), `${route} responded ${res?.status()}`).toBeTruthy();
        await settle(page);
        await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
        await page.screenshot({ path: `${OUT}/${slugOf(route)}--${vp}--${theme}.png`, fullPage: true });
      });
    }
  }
}
