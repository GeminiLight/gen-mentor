import { expect, test } from "@playwright/test";
import { seedArchive } from "./seed";
import { polishSeed } from "./polish-helpers";

test("mobile next-session titles stay within the viewport and chapters remain accessible", async ({ page }) => {
  const archive = seedArchive();
  archive.goals[0].learning_path[1].title = "从业务问题出发，使用 Python 和 SQL 完成销售数据清洗、统计推断与管理层可视化汇报";
  await polishSeed(page, archive);
  await page.setViewportSize({ width: 392, height: 852 });
  await page.goto("/session/0");
  await expect(page.getByRole("article")).toBeVisible();
  await expect(page.locator("details summary", { hasText: "Contents" })).toBeVisible();
  await page.locator("details summary", { hasText: "Contents" }).click();
  await expect(page.getByRole("link", { name: "Foundational Concepts", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Foundational Concepts", exact: true }).click();
  await page.getByTestId("reading-end").scrollIntoViewIfNeeded();
  const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
  await expect(page.getByTestId("next-session")).toBeVisible();
});

test("model settings fit a short viewport and both actions can be reached", async ({ page }) => {
  await polishSeed(page);
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto("/profile");
  await page.getByTestId("open-model-settings").filter({ visible: true }).click();
  const dialog = page.getByRole("dialog");
  const bounds = await dialog.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(375);
  await dialog.getByRole("button", { name: "Save", exact: true }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeInViewport();
  await dialog.getByRole("button", { name: "Close", exact: true }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
});

test("formatted Markdown headings have matching table-of-contents targets", async ({ page }) => {
  const archive = seedArchive();
  archive.goals[0].sessions["g_seed:0"].document.markdown = "## 使用 `groupby()` 聚合\n\n正文。\n\n## 理解 **数据清洗**\n\n第二节正文。";
  await polishSeed(page, archive);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/session/0");
  await expect(page.getByRole("article")).toBeVisible();
  const targets = await page.locator('[data-testid="doc-toc"] a').evaluateAll((links) => links.map((el) => !!document.getElementById(decodeURIComponent((el as HTMLAnchorElement).hash.slice(1)))));
  expect(targets.length).toBeGreaterThanOrEqual(2);
  expect(targets.every(Boolean)).toBe(true);
});

test("returning home opens the next session directly and library search finds body text", async ({ page }) => {
  await polishSeed(page);
  await page.goto("/");
  await expect(page.getByTestId("continue-link")).toHaveAttribute("href", "/session/1");
  await page.goto("/library");
  await page.getByRole("searchbox").fill("groupby");
  await expect(page.getByTestId("library-card")).toHaveCount(1);
  await page.getByRole("searchbox").fill("not-present-in-the-reading");
  await expect(page.getByTestId("library-card")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("No matching readings");
});
