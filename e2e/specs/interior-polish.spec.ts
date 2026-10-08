import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { seedArchive } from "./seed";
import { polishSeed } from "./polish-helpers";
import { settle } from "./settle";

for (const width of [392, 1440]) {
  test(`library filters combine with search and recover from empty results at ${width}`, async ({ page }) => {
    const archive = seedArchive();
    const goal = archive.goals[0];
    Object.assign(goal.sessions, {
      "g_seed:1": { opened_at: [], document: {
        structure: { title: "SQL reference notebook", overview: "A second saved reading.", content: "", summary: "" },
        markdown: "## SQL reference\n\nSELECT rows from a table.",
      } },
    });
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await polishSeed(page, archive);
    await page.goto("/library");
    await expect(page.getByTestId("library-card")).toHaveCount(2);
    const filters = page.getByRole("group", { name: "Filter readings" });
    await filters.getByRole("button", { name: "Reading 1", exact: true }).click();
    await expect(page.getByTestId("library-card")).toHaveCount(1);
    await expect(page.getByTestId("library-card")).toContainText("SQL reference notebook");
    await page.getByRole("searchbox").fill("SQL reference");
    await expect(page.getByTestId("library-card")).toHaveCount(1);
    await filters.getByRole("button", { name: "Completed 1", exact: true }).click();
    await expect(page.getByTestId("library-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(page.getByRole("searchbox")).toHaveValue("");
    await expect(page.getByRole("searchbox")).toBeFocused();
    await expect(filters.getByRole("button", { name: "All 2", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("library-card")).toHaveCount(2);
    await page.getByRole("searchbox").fill("SQL reference notebook");
    await expect(page.getByTestId("library-card")).toHaveCount(1);
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByRole("searchbox")).toBeFocused();
    await expect(page.getByTestId("library-card")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    mkdirSync("artifacts/interior", { recursive: true });
    await page.screenshot({ path: `artifacts/interior/library-${width}.png`, fullPage: true });
  });
}

test("reading options close with Escape and return keyboard focus", async ({ page }) => {
  await polishSeed(page);
  await page.goto("/session/0");
  const trigger = page.getByLabel("Session options", { exact: true });
  await trigger.click();
  const download = page.getByRole("button", { name: "Download reading" });
  await expect(download).toBeVisible();
  await download.focus();
  await page.keyboard.press("Escape");
  await expect(download).toBeHidden();
  await expect(trigger).toBeFocused();
});

for (const [width, theme] of [[392, "dark"], [1440, "light"]] as const) {
  test(`Chinese interior pages keep their layout at ${width} in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.addInitScript((theme) => {
      localStorage.setItem("genmentor.lang.v1", JSON.stringify({ state: { lang: "zh" }, version: 0 }));
      localStorage.setItem("theme", theme);
    }, theme);
    await polishSeed(page);
    mkdirSync("artifacts/interior", { recursive: true });
    for (const route of ["/", "/goals", "/learning-path", "/library", "/progress", "/profile", "/session/0", "/session/0#quiz"]) {
      await page.goto(route);
      await settle(page);
      if (route.endsWith("#quiz")) {
        await page.getByTestId("tab-quiz").click();
        await expect(page.getByTestId("quiz-score")).toBeVisible();
        const selectedCorrect = page.locator('[data-testid="question"][data-verdict="correct"] label:has(input:checked)').first();
        const selectedIncorrect = page.locator('[data-testid="question"][data-verdict="incorrect"] label:has(input:checked)').first();
        expect(await selectedCorrect.evaluate((el) => getComputedStyle(el).backgroundColor))
          .not.toBe(await selectedIncorrect.evaluate((el) => getComputedStyle(el).backgroundColor));
      }
      await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
      await page.screenshot({ path: `artifacts/interior/${route.replace(/[^a-z0-9]/g, "-") || "desk"}-${width}-${theme}-zh.png`, fullPage: true });
    }
    await page.getByRole("button", { name: "导师", exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: `artifacts/interior/tutor-${width}-${theme}-zh.png` });
  });
}
