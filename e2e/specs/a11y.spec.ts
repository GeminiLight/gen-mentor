import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { discoverRoutes, THEMES } from "./routes";
import { seed } from "./seed";
import { settle } from "./settle";

/** Zero serious or critical axe violations on every page, in both themes. */
for (const { pattern, url } of discoverRoutes({ id: "0" })) {
  for (const theme of THEMES) {
    test(`a11y ${pattern} ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((t) => window.localStorage.setItem("theme", t), theme);
      await seed(page);
      await page.goto(url);
      await settle(page);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(
        blocking,
        blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`).join("\n"),
      ).toEqual([]);
    });
  }
}
