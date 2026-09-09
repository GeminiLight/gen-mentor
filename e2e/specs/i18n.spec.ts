import { expect, test } from "@playwright/test";
import { seed } from "./seed";

/**
 * The UI speaks Chinese and English. Switching must translate every page's chrome, persist
 * across reloads, set <html lang>, and never leak a dictionary key.
 */
const PAGES = ["/", "/goals", "/learning-path", "/library", "/progress", "/profile", "/session/0", "/onboarding"];
const KEY_LEAK = /\b(common|nav|home|onboarding|goals|path|session|quiz|library|progress|profile|tutor|command|health|levels|polish|review)\.[a-zA-Z]+\b/;

test("defaults to the browser language", async ({ browser }) => {
  const zh = await browser.newContext({ locale: "zh-CN" });
  const page = await zh.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("朝着目标学。");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await zh.close();
});

test("switching to Chinese translates every page and persists", async ({ page }) => {
  await seed(page);
  await page.goto("/goals");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Goals");
  await page.getByTestId("lang-toggle").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("目标");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

  const expected: Record<string, RegExp> = {
    "/": /从上次停下的地方，继续/,
    "/goals": /^目标$/,
    "/learning-path": /^学习路径$/,
    "/library": /^文库$/,
    "/progress": /^进度$/,
    "/profile": /^画像$/,
    "/session/0": /Python Fundamentals/, // session titles come from the model
    "/onboarding": /你想到达哪里/,
  };
  for (const url of PAGES) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(expected[url]);
    const body = await page.locator("body").innerText();
    expect(body, `${url} leaks a dictionary key`).not.toMatch(KEY_LEAK);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  }
  await page.goto("/learning-path");
  await expect(page.getByRole("heading", { level: 1, name: "学习路径" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Transition into");
  await expect(page.getByRole("link", { name: /开始/ }).first()).toBeVisible();
});

test("English pages leak no dictionary keys either", async ({ page }) => {
  await seed(page);
  for (const url of PAGES) {
    await page.goto(url);
    const body = await page.locator("body").innerText();
    expect(body, `${url} leaks a dictionary key`).not.toMatch(KEY_LEAK);
  }
});
