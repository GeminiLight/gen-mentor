import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { mockReview } from "./onboarding-review-helpers";

async function health(page: Page, key = false) {
  await page.route("**/api/health", (r) => r.fulfill({ json: { ok: true, serverKey: key, mode: "live", models: { fast: "test", smart: "test" }, provider: "openai" } }));
}

test("landing previews are clearly examples and never overwrite a saved draft", async ({ page }) => {
  await health(page);
  await page.addInitScript(() => localStorage.setItem("genmentor.onboarding.v1", JSON.stringify({ state: { goal: "My existing goal", info: "My own background", count: "6", checkpoint: null }, version: 0 })));
  await page.goto("/");
  await page.getByRole("button", { name: "AI agents", exact: true }).click();
  await expect(page.getByTestId("path-preview")).toContainText("Build and evaluate an AI research assistant");
  await expect(page.getByTestId("path-preview")).toContainText("Illustrative examples");
  await page.getByRole("link", { name: "Continue your draft" }).click();
  await expect(page.getByLabel("Goal", { exact: true })).toHaveValue("My existing goal");
  await expect(page.getByLabel("Background", { exact: true })).toHaveValue("My own background");
  await expect(page.getByLabel("Sessions", { exact: true })).toHaveText("6 sessions");
});

test("goal examples fill only the empty goal and focus its editable field", async ({ page }) => {
  await health(page);
  await page.goto("/onboarding");
  await page.getByLabel("Background", { exact: true }).fill("My own experience");
  await page.getByRole("button", { name: "Data analysis", exact: true }).click();
  await expect(page.getByLabel("Goal", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Goal", { exact: true })).toHaveValue("Use Python to turn business data into clear decisions");
  await expect(page.getByLabel("Background", { exact: true })).toHaveValue("My own experience");
  await expect(page.getByRole("button", { name: "AI agents", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Goal", { exact: true })).toHaveValue("Use Python to turn business data into clear decisions");
});

test("missing model is resolved in place before analysis without losing the draft or auto-submitting", async ({ page }) => {
  const calls = await mockReview(page);
  await health(page);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Analyze my goal" }).click();
  await expect(page.getByLabel("Goal", { exact: true })).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Goal", { exact: true }).fill("Build an AI research assistant");
  await page.getByLabel("Background", { exact: true }).fill("I know Python.");
  await page.getByRole("button", { name: "Analyze my goal" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(calls.refine).toBe(0);
  await page.getByLabel("API key", { exact: true }).fill("sk-local-test-only");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Background", { exact: true })).toHaveValue("I know Python.");
  expect(calls.refine).toBe(0);
  await expect(page.getByTestId("entry-model").getByRole("button", { name: "Model", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Analyze my goal" }).click();
  await expect(page.getByTestId("review-controls")).toBeVisible();
  expect(calls.refine).toBe(1);
  expect(calls.profiles).toHaveLength(0);
});

test("a failed configuration check retains fields and does not start generation", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/health", (r) => r.abort());
  await page.route("**/api/refine-goal", (r) => { calls++; return r.abort(); });
  await page.goto("/onboarding");
  await page.getByLabel("Goal", { exact: true }).fill("Learn Python for analysis");
  await page.getByLabel("Background", { exact: true }).fill("I use Excel");
  await page.getByRole("button", { name: "Analyze my goal" }).click();
  await expect(page.getByTestId("entry-model")).toContainText("Could not check model configuration");
  await expect(page.getByLabel("Goal", { exact: true })).toHaveValue("Learn Python for analysis");
  expect(calls).toBe(0);
});

for (const width of [392, 1440]) for (const theme of ["light", "dark"]) for (const lang of ["en", "zh"]) {
  test(`first visit survives ${width}px ${theme} ${lang}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(({ theme, lang }) => {
      localStorage.setItem("theme", theme);
      localStorage.setItem("genmentor.lang.v1", JSON.stringify({ state: { lang }, version: 0 }));
    }, { theme, lang });
    await health(page);
    await mkdir("artifacts/entry", { recursive: true });
    for (const route of ["/", "/onboarding"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const action = route === "/" ? page.getByRole("link", { name: lang === "en" ? "Set a goal" : "设定目标", exact: true }) : page.getByRole("button", { name: lang === "en" ? "Analyze my goal" : "分析我的目标", exact: true });
      await expect(action).toBeVisible();
      if (route === "/") expect((await action.boundingBox())!.y).toBeLessThan(600);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: `artifacts/entry/${route === "/" ? "home" : "onboard"}-${width}-${theme}-${lang}.png`, fullPage: true, animations: "disabled" });
    }
  });
}

test("320px touch layout keeps long input, guidance and controls reachable", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await health(page);
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Set a goal", exact: true }).click();
  await page.getByLabel("Goal", { exact: true }).fill("Learn to design and evaluate reliable AI agents for complex research workflows, with clear failure recovery and evidence-based reports.");
  await page.getByLabel("Background", { exact: true }).fill("I have used Python and basic language-model APIs, but need practice evaluating agent behavior.");
  await page.getByText("Make the path useful to you", { exact: true }).first().click();
  await expect(page.getByText("Describe an outcome", { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await page.getByRole("button", { name: "Analyze my goal" }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await page.getByLabel("Sessions", { exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await mkdir("artifacts/entry", { recursive: true });
  await page.screenshot({ path: "artifacts/entry/onboard-320-touch.png", fullPage: true });
  await context.close();
});

test("leaving during a configuration check cannot start an abandoned analysis", async ({ page }) => {
  let checks = 0, analyses = 0;
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/health", async (route) => {
    const check = ++checks;
    if (check === 2) await delayed;
    await route.fulfill({ json: { ok: true, serverKey: check === 2, mode: "live", models: { fast: "test", smart: "test" } } });
  });
  await page.route("**/api/refine-goal", (route) => { analyses++; return route.abort(); });
  await page.goto("/onboarding");
  await expect(page.getByTestId("entry-model")).toContainText("Connect a model to analyze");
  await page.getByLabel("Goal", { exact: true }).fill("Analyze sales with Python");
  await page.getByLabel("Background", { exact: true }).fill("I use spreadsheets");
  await page.getByRole("button", { name: "Analyze my goal" }).click();
  await expect.poll(() => checks).toBe(2);
  await page.getByRole("link", { name: "GenMentor", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  release();
  await expect(page.getByRole("link", { name: "Continue your draft" })).toBeVisible();
  await page.getByRole("link", { name: "Continue your draft" }).click();
  await expect(page.getByLabel("Goal", { exact: true })).toHaveValue("Analyze sales with Python");
  expect(analyses).toBe(0);
});
