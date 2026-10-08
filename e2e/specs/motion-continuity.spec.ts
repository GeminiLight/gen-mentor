import { expect, test } from "@playwright/test";
import { mockReview } from "./onboarding-review-helpers";
import { polishSeed } from "./polish-helpers";

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`help disclosure preserves keyboard focus and hides closed content: ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await mockReview(page);
    await page.goto("/onboarding");
    const trigger = page.getByRole("button", { name: "Make the path useful to you" });
    const detail = page.getByRole("heading", { name: "Describe an outcome", exact: true });
    await expect(detail).toBeHidden();
    await trigger.focus();
    await trigger.press("Enter");
    await expect(detail).toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.press("Space");
    await expect(detail).toBeHidden();
    await expect(trigger).toBeFocused();
    if (reducedMotion === "reduce") {
      expect(await page.locator(".entry-surface").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    }
  });
}

test("animated phase transitions keep the draft and announce only the current phase", async ({ page }) => {
  await mockReview(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/onboarding");
  const active = page.locator('[aria-current="step"]');
  await expect(active).toHaveCount(1);
  await expect(active).toContainText("Your starting point");
  await page.getByLabel("Goal", { exact: true }).fill("Build an AI research assistant");
  await page.getByLabel("Background", { exact: true }).fill("I know Python.");
  await page.getByRole("button", { name: "Analyze my goal" }).click();
  await expect(page.getByTestId("review-controls")).toBeVisible();
  await expect(active).toHaveCount(1);
  await expect(active).toContainText("Review together");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.getByRole("button", { name: "Back to details", exact: true }).click();
  await expect(active).toContainText("Your starting point");
  await expect(page.getByLabel("Goal", { exact: true })).toHaveValue("Build an AI research assistant");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("resizing the writing surface keeps help and the final action reachable", async ({ page }) => {
  await mockReview(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/onboarding");
  const goal = page.getByLabel("Goal", { exact: true });
  await goal.fill("Learn to build reliable research tools");
  await page.setViewportSize({ width: 320, height: 740 });
  const help = page.getByRole("button", { name: "Make the path useful to you" });
  await help.click();
  await expect(page.getByRole("heading", { name: "Describe an outcome" })).toBeVisible();
  const footer = page.getByText("Text goes to your configured model. Your archive stays on this device.");
  await expect.poll(async () => {
    const surface = await page.locator(".entry-surface").boundingBox();
    const text = await footer.boundingBox();
    return !!surface && !!text && text.y + text.height <= surface.y + surface.height;
  }).toBe(true);
  await help.click();
  await page.getByRole("button", { name: "Analyze my goal" }).click();
  await expect(page.getByLabel("Background", { exact: true })).toBeFocused();
  await expect(goal).toHaveValue("Learn to build reliable research tools");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`moving tab selection retains keyboard behavior: ${reducedMotion}`, async ({ page }) => {
    await polishSeed(page);
    await page.emulateMedia({ reducedMotion });
    await page.goto("/session/0");
    const read = page.getByRole("tab", { name: "Read", exact: true });
    const quiz = page.getByTestId("tab-quiz");
    await read.focus();
    await read.press("ArrowRight");
    await expect(quiz).toBeFocused();
    await expect(quiz).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toBeVisible();
    await quiz.press("ArrowLeft");
    await expect(read).toBeFocused();
    await expect(read).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toBeVisible();
  });
}
