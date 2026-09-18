import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { seedArchive } from "./seed";
import { polishSeed, saved } from "./polish-helpers";

test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

function multipleGoals() {
  const archive = seedArchive();
  archive.goals.push({ ...structuredClone(archive.goals[0]), id: "second", original_goal: "Design reliable AI agents", learning_goal: "Design reliable AI agents for research with tools and evaluations", sessions: {}, tutor: [], learning_path: archive.goals[0].learning_path.slice(0, 1).map((s) => ({ ...s, title: "Agent architecture", if_learned: false })) });
  return archive;
}

for (const width of [392, 1440]) {
  test(`one command dialog opens and closes with the keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await polishSeed(page, multipleGoals());
    await page.goto("/goals");
    await expect(page.locator("main[data-hydrated]")).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(page.locator("[data-command-trigger]:visible")).toBeFocused();
    await page.locator("[data-command-trigger]:visible").click();
    await page.getByRole("combobox").fill("Library");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`goal picker shows context and switches safely at ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 850 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addInitScript((theme) => localStorage.setItem("theme", theme), theme);
      await polishSeed(page, multipleGoals());
      await page.goto("/session/0");
      await page.getByRole("button", { name: "Switch goal", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("option")).toHaveCount(2);
      const a11y = await new AxeBuilder({ page }).analyze();
      expect(a11y.violations.filter((v) => ["serious", "critical"].includes(v.impact!))).toEqual([]);
      mkdirSync("artifacts/navigation-polish", { recursive: true });
      await page.screenshot({ path: `artifacts/navigation-polish/picker-${width}-${theme}.png` });
      await page.getByRole("combobox").fill("No such goal");
      await expect(dialog.getByText("No matching goals. Try another search.")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Manage goals" })).toBeVisible();
      await page.getByRole("combobox").fill("agents");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/learning-path$/);
      await expect(page.getByRole("heading", { name: "Agent architecture", exact: true })).toBeVisible();
      expect((await saved(page)).active_goal_id).toBe("second");
      await page.reload();
      await expect(page.locator("[data-goal-trigger]:visible")).toContainText("Design reliable AI agents");
      await page.getByRole("button", { name: "Tutor", exact: true }).click();
      await expect(page.getByTestId("tutor-messages")).not.toContainText("Where should I start this week?");
    });
  }
}

test("goal picker stays within a short viewport and keeps actions reachable", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 320 });
  const archive = multipleGoals();
  archive.goals.push(...Array.from({ length: 12 }, (_, i) => ({ ...structuredClone(archive.goals[0]), id: `extra-${i}`, original_goal: `A long research learning objective ${i}`, sessions: {} })));
  await polishSeed(page, archive);
  await page.goto("/goals");
  await page.getByRole("button", { name: "Switch goal", exact: true }).click();
  const box = await page.getByRole("dialog").boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Manage goals" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("pinned tutor leaves readable goal cards and long drafts do not cover messages", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const archive = multipleGoals();
  archive.goals[0].tutor = Array.from({ length: 16 }, (_, i) => ({ role: i % 2 ? "assistant" as const : "user" as const, content: `Message ${i}: ${"A paragraph about learning agents. ".repeat(12)}` }));
  archive.goals[0].tutor.push({ role: "assistant", content: "```js\nconst path = '" + "x".repeat(240) + "';\n```" });
  await polishSeed(page, archive);
  await page.goto("/goals");
  await page.getByRole("button", { name: "Tutor", exact: true }).click();
  await page.getByRole("button", { name: "Pin to side", exact: true }).click();
  const cards = page.getByTestId("goal-card");
  expect((await cards.first().boundingBox())!.width).toBeGreaterThan(280);
  const input = page.getByLabel("Message to the tutor");
  await input.fill("A long draft\n".repeat(24));
  expect((await input.boundingBox())!.height).toBeLessThanOrEqual(160);
  const log = page.getByTestId("tutor-messages");
  expect((await log.boundingBox())!.height).toBeGreaterThan(200);
  expect(await log.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await log.evaluate((el) => { el.scrollTop = 0; });
  await page.getByRole("button", { name: "Latest message", exact: true }).click();
  await expect.poll(() => log.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(2);
  await expect(page.getByRole("button", { name: "Latest message", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1280);
  await page.screenshot({ path: "artifacts/navigation-polish/pinned-goals.png" });
});

test("mobile tutor keeps its message history and send action visible with a long draft", async ({ page }) => {
  await page.setViewportSize({ width: 392, height: 500 });
  await polishSeed(page);
  await page.goto("/learning-path");
  await page.getByRole("button", { name: "Tutor", exact: true }).click();
  await page.getByLabel("Message to the tutor").fill("A multiline question\n".repeat(20));
  const history = await page.getByTestId("tutor-messages").boundingBox();
  expect(history!.height).toBeGreaterThan(100);
  const send = await page.getByRole("button", { name: "Send", exact: true }).boundingBox();
  expect(send!.y + send!.height).toBeLessThan(500);
  await page.screenshot({ path: "artifacts/navigation-polish/mobile-composer.png" });
});
