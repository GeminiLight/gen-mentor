import { expect, test } from "@playwright/test";
import { mockReview } from "./onboarding-review-helpers";

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
