import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { mockReview, startReview, reviewGap } from "./onboarding-review-helpers";

const names = ["Python programming", "LLM fundamentals", "Agent architecture and multi-step planning", "LLM reasoning techniques (CoT, ReAct, Reflection)", "Retrieval-augmented generation (RAG)", "AI research methods and evaluation"];
for (const width of [392, 1440]) for (const theme of ["light", "dark"] as const) {
  test(`skill confirmation fits ${width}px in ${theme} theme with accessible sliders`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.addInitScript((theme) => localStorage.setItem("theme", theme), theme);
    const gap = { skill_requirements: names.map((name) => ({ ...reviewGap.skill_requirements[0], name })), skill_gaps: names.map((name) => ({ ...reviewGap.skill_gaps[0], name })) };
    await mockReview(page, { gap });
    await startReview(page);
    await expect(page.getByRole("slider")).toHaveCount(12);
    const size = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    expect(size.width).toBeLessThanOrEqual(size.viewport);
    if (width === 392) {
      const controls = await page.getByTestId("review-controls").boundingBox();
      expect(controls!.height).toBeLessThanOrEqual(160);
      await page.getByRole("slider").first().press("ArrowRight");
      const slider = await page.getByRole("slider").first().boundingBox();
      const footer = await page.getByTestId("review-controls").boundingBox();
      expect(slider!.y + slider!.height).toBeLessThan(footer!.y);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
    mkdirSync("artifacts/review-confirmation", { recursive: true });
    await page.screenshot({ path: `artifacts/review-confirmation/${width}-${theme}.png`, fullPage: true });
  });
}
