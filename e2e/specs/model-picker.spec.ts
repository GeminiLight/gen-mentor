import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { polishSeed } from "./polish-helpers";

async function openSettings(page: Page) {
  await polishSeed(page);
  await page.goto("/learning-path");
  await page.locator('[data-testid="open-model-settings"]:visible').first().click();
}
const choose = (page: Page, model = "Fast model") => page.getByRole("button", { name: `Choose ${model}`, exact: true });
const catalog = { models: [{ id: "fast-example", name: "Quick model" }, { id: "smart-example", name: "Reasoning model" }], truncated: false };

test("search, keyboard selection and shared catalog preserve editable model IDs", async ({ page }) => {
  await openSettings(page);
  const requests: unknown[] = [];
  await page.route("**/api/models", async (route) => { requests.push(route.request().postDataJSON()); await route.fulfill({ json: catalog }); });
  await page.getByLabel("API key", { exact: true }).fill("sk-test-picker");
  await page.getByLabel("Endpoint (optional)").fill("https://gateway.test/v1");
  await choose(page).click();
  await page.getByRole("combobox", { name: "Search models…" }).fill("Quick");
  await expect(page.getByRole("option", { name: /Quick model/ })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Fast model", { exact: true })).toHaveValue("fast-example");
  await expect(choose(page)).toBeFocused();
  await choose(page, "Smart model").click();
  await page.getByRole("option", { name: /Reasoning model/ }).click();
  await expect(page.getByLabel("Smart model", { exact: true })).toHaveValue("smart-example");
  expect(requests).toEqual([{ provider: "openai", apiKey: "sk-test-picker", baseUrl: "https://gateway.test/v1" }]);
  await page.getByLabel("Fast model", { exact: true }).fill("private/custom-model");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("genmentor.llm.v1")!).state.byok);
  expect(stored).toMatchObject({ fastModel: "private/custom-model", smartModel: "smart-example" });
});

test("missing key, upstream failure and retry leave custom input usable", async ({ page }) => {
  await openSettings(page);
  let calls = 0;
  await page.route("**/api/models", (route) => { calls++; return route.fulfill(calls === 1 ? { status: 401, json: { error: "unauthorized" } } : { json: catalog }); });
  await choose(page).click();
  await expect(page.getByText("Enter a valid API key and endpoint above to load models.")).toBeVisible();
  expect(calls).toBe(0);
  await page.keyboard.press("Escape");
  await page.getByLabel("API key", { exact: true }).fill("sk-test-picker");
  await choose(page).click();
  await expect(page.getByText(/This key cannot read/)).toBeVisible();
  await page.getByRole("button", { name: "Refresh model list" }).click();
  await expect(page.getByRole("option", { name: /Quick model/ })).toBeVisible();
  await page.getByRole("combobox", { name: "Search models…" }).fill("unknown-custom-id");
  await expect(page.getByText("No matching models. You can enter a custom ID.")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Fast model", { exact: true }).fill("unknown-custom-id");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
});

test("changing endpoint or provider invalidates the shared list", async ({ page }) => {
  await openSettings(page);
  let calls = 0;
  await page.route("**/api/models", (route) => route.fulfill({ json: { models: [{ id: `catalog-${++calls}` }], truncated: false } }));
  await page.getByLabel("API key", { exact: true }).fill("sk-test-picker");
  await choose(page).click();
  await expect(page.getByRole("option", { name: "catalog-1" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Endpoint (optional)").fill("https://other.test/v1");
  await choose(page, "Smart model").click();
  await expect(page.getByRole("option", { name: "catalog-2" })).toBeVisible();
  await expect(page.getByRole("option", { name: "catalog-1" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByLabel("Provider", { exact: true }).click();
  await page.getByRole("option", { name: "Anthropic", exact: true }).click();
  await choose(page).click();
  await expect(page.getByRole("option", { name: "catalog-3" })).toBeVisible();
});

test("mobile list handles long names and passes accessibility checks", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openSettings(page);
  await page.route("**/api/models", (route) => route.fulfill({ json: { models: [...catalog.models, { id: "organization/very-long-custom-text-model-name-for-research-2026" }], truncated: false } }));
  await page.getByLabel("API key", { exact: true }).fill("sk-test-picker");
  await choose(page).click();
  await expect(page.getByRole("option", { name: /organization/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("option", { name: /organization/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/model-picker-mobile.png" });
  await page.getByRole("option", { name: /organization/ }).click();
  await expect(page.getByLabel("Fast model", { exact: true })).toHaveValue("organization/very-long-custom-text-model-name-for-research-2026");
});

test("model endpoint requires explicit credentials and never echoes invalid input", async ({ request }) => {
  const response = await request.post("/api/models", { data: { provider: "openai", apiKey: "secret", baseUrl: "file:///private" } });
  expect(response.status()).toBe(400);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ error: "invalidConnection" });
});

test("changing a key cancels a pending catalog and ignores its late response", async ({ page }) => {
  await openSettings(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/models", async (route) => {
    if (route.request().postDataJSON().apiKey === "sk-test-first") {
      await pending;
      await route.fulfill({ json: { models: [{ id: "stale-model" }], truncated: false } });
    } else await route.fulfill({ json: catalog });
  });
  await page.getByLabel("API key", { exact: true }).fill("sk-test-first");
  await choose(page).click();
  await expect(page.getByText("Loading models from your endpoint…")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("API key", { exact: true }).fill("sk-test-second");
  await choose(page).click();
  await expect(page.getByRole("option", { name: /Quick model/ })).toBeVisible();
  release();
  await expect(page.getByRole("option", { name: "stale-model" })).toHaveCount(0);
  await expect(page.getByLabel("Fast model", { exact: true })).toHaveValue("gpt-4.1-mini");
});

test("empty catalogs explain manual entry", async ({ page }) => {
  await openSettings(page);
  await page.route("**/api/models", (route) => route.fulfill({ json: { models: [], truncated: false } }));
  await page.getByLabel("API key", { exact: true }).fill("sk-test-picker");
  await choose(page).click();
  await expect(page.getByText("This endpoint returned no models. Enter a model ID instead.")).toBeVisible();
});

for (const theme of ["light", "dark"]) test(`Chinese desktop model picker ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript((theme) => {
    localStorage.setItem("theme", theme);
    localStorage.setItem("genmentor.lang.v1", JSON.stringify({ state: { lang: "zh" }, version: 0 }));
  }, theme);
  await openSettings(page);
  await page.route("**/api/models", (route) => route.fulfill({ json: catalog }));
  await page.getByLabel("API 密钥", { exact: true }).fill("sk-test-picker");
  await page.getByRole("button", { name: "选择强模型", exact: true }).click();
  await expect(page.getByRole("option", { name: /Reasoning model/ })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `artifacts/model-picker-desktop-zh-${theme}.png` });
});
