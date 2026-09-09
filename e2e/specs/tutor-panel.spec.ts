import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { seed, STORAGE_KEY } from "./seed";

const message = "Message to the tutor";
const pin = "Pin to side";
const unpin = "Unpin · open on demand";

for (const theme of ["light", "dark"] as const) {
  test(`pinned tutor supports reading, navigation and saved preference in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.addInitScript((theme) => localStorage.setItem("theme", theme), theme);
    await seed(page);
    await page.goto("/session/0");
    await page.getByRole("button", { name: "Tutor", exact: true }).click();
    await page.getByLabel(message).fill("Help me understand this example");
    await page.getByRole("button", { name: pin, exact: true }).click();
    const dock = page.getByTestId("tutor-dock");
    await expect(dock).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByLabel(message)).toHaveValue("Help me understand this example");
    await expect(page.getByLabel(message)).toBeFocused();
    const bounds = await page.locator("main").boundingBox();
    const panel = await dock.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(panel!.x);
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
    mkdirSync("artifacts/tutor-panel", { recursive: true });
    await page.screenshot({ path: `artifacts/tutor-panel/1440-${theme}.png`, fullPage: true });
    await page.getByRole("link", { name: "Path", exact: true }).first().click();
    await expect(dock).toBeVisible();
    await expect(page.getByLabel(message)).toHaveValue("Help me understand this example");
    await page.reload();
    await expect(dock).toBeVisible();
    await page.getByLabel(message).fill("Keep this draft while switching");
    await page.getByRole("button", { name: unpin, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(dock).toHaveCount(0);
    await expect(page.getByLabel(message)).toHaveValue("Keep this draft while switching");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tutor", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Tutor", exact: true }).click();
    await expect(page.getByLabel(message)).toHaveValue("Keep this draft while switching");
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("one pending reply survives pin, resize, close and reopening", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page);
  let requests = 0;
  let finish!: () => void;
  const ready = new Promise<void>((resolve) => { finish = resolve; });
  await page.route("**/api/tutor", async (route) => { requests++; await ready; await route.fulfill({ contentType: "text/plain", body: "A single continuous answer." }); });
  await page.goto("/learning-path");
  await page.getByRole("button", { name: "Tutor", exact: true }).click();
  await page.getByLabel(message).fill("Explain this");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByTestId("tutor-stop")).toBeVisible();
  await page.getByRole("button", { name: pin, exact: true }).click();
  await expect(page.getByTestId("tutor-stop")).toBeVisible();
  await page.setViewportSize({ width: 392, height: 852 });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: pin, exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(392);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Tutor", exact: true }).click();
  await expect(page.getByTestId("tutor-stop")).toBeVisible();
  finish();
  await expect(page.getByTestId("tutor-messages")).toContainText("A single continuous answer.");
  expect(requests).toBe(1);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.goals[0].tutor.length, STORAGE_KEY)).toBe(4);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId("tutor-dock")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByTestId("tutor-dock")).toHaveCount(0);
  await page.getByRole("button", { name: "Tutor", exact: true }).click();
  await expect(page.getByTestId("tutor-dock")).toBeVisible();
});

for (const width of [392, 1024, 1280]) for (const theme of ["light", "dark"] as const) {
  test(`tutor adapts at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.addInitScript((theme) => localStorage.setItem("theme", theme), theme);
    await seed(page);
    await page.goto("/session/0");
    await page.getByRole("button", { name: "Tutor", exact: true }).click();
    if (width >= 1280) await page.getByRole("button", { name: pin, exact: true }).click();
    else await expect(page.getByRole("button", { name: pin, exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (width === 392) expect((await page.getByRole("dialog").boundingBox())!.width).toBe(width);
    if (width === 1280) {
      await expect(page.locator("main details").filter({ has: page.getByText("Contents", { exact: true }) })).toBeVisible();
      expect((await page.locator("article.reading").boundingBox())!.width).toBeGreaterThan(600);
    }
    const form = await page.getByLabel(message).boundingBox();
    expect(form!.y + form!.height).toBeLessThanOrEqual(852);
    if (width >= 1280) {
      await page.evaluate(() => window.scrollTo(0, 600));
      expect((await page.getByTestId("tutor-dock").boundingBox())!.y).toBe(0);
      expect(await page.locator("main").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
    mkdirSync("artifacts/tutor-panel", { recursive: true });
    await page.screenshot({ path: `artifacts/tutor-panel/${width}-${theme}.png` });
  });
}
