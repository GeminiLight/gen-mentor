import { expect, test } from "@playwright/test";
import { seed } from "./seed";

/**
 * The UI speaks Chinese and English. Switching must translate every page's chrome, persist
 * across reloads, set <html lang>, and never leak a dictionary key.
 */
const PAGES = ["/", "/goals", "/learning-path", "/library", "/progress", "/profile", "/session/0", "/onboarding"];
const KEY_LEAK = /\b(common|nav|home|onboarding|goals|path|session|quiz|library|progress|profile|tutor|command|health|levels)\.[a-zA-Z]+\b/;

test("defaults to the browser language", async ({ browser }) => {
  const zh = await browser.newContext({ locale: "zh-CN" });
  const page = await zh.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("说出你想到达的位置，它来铺路。");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await zh.close();
});

test("switching to Chinese translates every page and persists", async ({ page }) => {
  await seed(page);
  await page.goto("/goals");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What you are working toward");
  await page.getByTestId("lang-toggle").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("你正在朝什么努力");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

  const expected: Record<string, RegExp> = {
    "/": /说出你想到达的位置/,
    "/goals": /你正在朝什么努力/,
    "/learning-path": /Transition into/, // the goal text is the learner's own words
    "/library": /为你写下的一切/,
    "/progress": /真正发生了什么变化/,
    "/profile": /GenMentor 眼中的你/,
    "/session/0": /Python Fundamentals/, // session titles come from the model
    "/onboarding": /说出你想到达的位置/,
  };
  for (const url of PAGES) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(expected[url]);
    const body = await page.locator("body").innerText();
    expect(body, `${url} leaks a dictionary key`).not.toMatch(KEY_LEAK);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  }
  await page.goto("/learning-path");
  await expect(page.getByText("学习路径")).toBeVisible();
  await expect(page.getByRole("link", { name: /开始学习/ }).first()).toBeVisible();
});

test("English pages leak no dictionary keys either", async ({ page }) => {
  await seed(page);
  for (const url of PAGES) {
    await page.goto(url);
    const body = await page.locator("body").innerText();
    expect(body, `${url} leaks a dictionary key`).not.toMatch(KEY_LEAK);
  }
});
