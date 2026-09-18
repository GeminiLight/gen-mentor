import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { seedArchive } from "./seed";
import { polishSeed, saved } from "./polish-helpers";

const shots = "artifacts/learning-coach";
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

test("target attainment is independent of an arbitrary model percentage", async ({ page }) => {
  const archive = seedArchive();
  archive.goals[0].learner_profile.cognitive_status.overall_progress = 99;
  await polishSeed(page, archive);
  await page.goto("/progress");
  await expect(page.getByTestId("overall-ring-value")).toHaveText("25%");
  await page.getByText("How this is calculated", { exact: true }).click();
  await expect(page.getByText(/Each skill counts once/)).toBeVisible();
  await expect(page.getByTestId("review-queue")).toContainText("1 incorrect · 1 skipped");
  await expect(page.getByTestId("stat-review")).toHaveText("2");
});

test("targeted practice survives reload and resolves the review queue without replacing first-attempt evidence", async ({ page }) => {
  const archive = seedArchive();
  await polishSeed(page, archive);
  await page.goto("/progress");
  await page.getByTestId("review-queue").getByRole("link").first().click();
  const practice = page.getByRole("region", { name: "Focused practice", exact: true });
  await expect(practice).toBeVisible();
  await expect(practice.getByTestId("question")).toHaveCount(2);
  await practice.getByTestId("question").nth(0).getByRole("radio").nth(0).check();
  await page.reload();
  await expect(practice.getByTestId("question").nth(0)).toHaveAttribute("data-verdict", "correct");
  await practice.getByTestId("question").nth(1).getByRole("radio").nth(1).check();
  await practice.getByTestId("submit-quiz").click();
  await expect(practice.getByRole("status")).toContainText("Practice saved");
  const after = (await saved(page)).goals[0];
  expect(after.sessions["g_seed:0"].quiz_results).toEqual(archive.goals[0].sessions["g_seed:0"].quiz_results);
  expect(after.sessions["g_seed:0"].completed_at).toBe(archive.goals[0].sessions["g_seed:0"].completed_at);
  expect(after.mastery_history).toEqual(archive.goals[0].mastery_history);
  expect(after.sessions["g_seed:0"].practice.results.correct).toBe(2);
  await practice.getByRole("button", { name: "Back to first attempt" }).click();
  await expect(page.getByTestId("question")).toHaveCount(4);
  await expect(page.getByTestId("quiz-score")).toContainText("2 of 3 correct");
  await page.goto("/progress");
  await expect(page.getByTestId("review-queue")).toContainText("No outstanding quiz questions");
  await expect(page.getByTestId("stat-review")).toHaveText("0");
  await expect(page.getByTestId("stat-accuracy")).toHaveText("67%");
});

for (const width of [392, 1440]) for (const theme of ["light", "dark"]) {
  test(`progress and practice are legible at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((theme) => localStorage.setItem("theme", theme), theme);
    await polishSeed(page);
    await page.goto("/progress");
    await expect(page.getByTestId("review-queue")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await mkdir(shots, { recursive: true });
    await page.screenshot({ path: `${shots}/progress-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
    await page.getByTestId("review-queue").getByRole("link").first().click();
    await expect(page.getByRole("region", { name: "Focused practice" })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `${shots}/practice-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
  });
}

test("Chinese learning workspace and review actions have complete labels", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("genmentor.lang.v1", JSON.stringify({ state: { lang: "zh" }, version: 0 })));
  await polishSeed(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("下一步学习");
  await expect(page.getByTestId("review-queue")).toContainText("答错 1 道 · 跳过 1 道");
  await page.getByTestId("review-queue").getByRole("link").first().click();
  await expect(page.getByRole("region", { name: "专项练习" })).toBeVisible();
  await expect(page.getByRole("button", { name: "查看首次测验" })).toBeVisible();
});
