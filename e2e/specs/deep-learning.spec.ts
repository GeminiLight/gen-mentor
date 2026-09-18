import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { seedArchive } from "./seed";
import { polishSeed, saved } from "./polish-helpers";

const evidenceDir = "artifacts/deep-learning";
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });
const unfinished = () => {
  const archive = seedArchive();
  archive.goals[0].learning_path[0].if_learned = false;
  Object.assign(archive.goals[0].sessions["g_seed:0"], { completed_at: undefined });
  return archive;
};

test("completion survives offline assessment, refresh and retry without duplicate time or mastery", async ({ page }) => {
  const archive = unfinished();
  await polishSeed(page, archive);
  let requests = 0;
  await page.route("**/api/profile", (r) => { requests++; return r.fulfill({ status: 503, json: { error: "Offline" } }); });
  await page.goto("/session/0");
  await page.getByTestId("complete-session").click();
  await expect(page).toHaveURL(/learning-path/);
  const notice = page.getByRole("region", { name: "Learning record status" });
  await expect(notice).toContainText("could not be updated");
  const before = (await saved(page)).goals[0];
  expect(before.learning_path[0].if_learned).toBe(true);
  expect(before.sessions["g_seed:0"].quiz_results).toEqual(archive.goals[0].sessions["g_seed:0"].quiz_results);
  expect(before.mastery_history).toHaveLength(2);
  await page.reload();
  await expect(notice).toContainText("could not be updated");
  expect(requests).toBe(1);
  await page.route("**/api/profile", (r) => r.fulfill({ json: { learner_profile: archive.goals[0].learner_profile } }));
  await notice.getByRole("button", { name: "Try again" }).click();
  await expect(notice).toHaveCount(0);
  const after = (await saved(page)).goals[0];
  expect(after.sessions["g_seed:0"].completed_at).toBe(before.sessions["g_seed:0"].completed_at);
  expect(after.mastery_history).toHaveLength(3);
  await page.reload();
  expect((await saved(page)).goals[0].mastery_history).toHaveLength(3);
});

test("a slow skill estimate never blocks leaving the completed lesson", async ({ page }) => {
  await polishSeed(page, unfinished());
  let started = false;
  let release!: () => void;
  const pending = new Promise<void>((r) => { release = r; });
  await page.route("**/api/profile", async (r) => { started = true; await pending; await r.fulfill({ json: { learner_profile: seedArchive().goals[0].learner_profile } }); });
  try {
    await page.goto("/session/0");
    await page.getByTestId("complete-session").click();
    await expect(page).toHaveURL(/learning-path/);
    await expect.poll(() => started).toBe(true);
    await expect(page.getByRole("status").filter({ hasText: "Your learning is saved" })).toContainText("keep learning");
    await page.getByRole("link", { name: "Library", exact: true }).first().click();
    await expect(page).toHaveURL(/library/);
    expect((await saved(page)).goals[0].learning_path[0].if_learned).toBe(true);
  } finally { release(); }
});

for (const width of [392, 1440]) for (const theme of ["light", "dark"]) {
  test(`path hierarchy and correct quiz resumption ${width} ${theme}`, async ({ page }) => {
    const archive = unfinished();
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((theme) => localStorage.setItem("theme", theme), theme);
    await polishSeed(page, archive);
    await page.goto("/learning-path");
    const hero = page.getByRole("region", { name: "Focus for this session" });
    await expect(hero).toContainText("What you’re working toward");
    await expect(hero).toContainText("Answers saved");
    await expect(hero.getByRole("link", { name: "Review answers & finish" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const audit = await new AxeBuilder({ page }).analyze();
    expect(audit.violations).toEqual([]);
    await mkdir(evidenceDir, { recursive: true });
    await page.screenshot({ path: `${evidenceDir}/path-${width}-${theme}.png`, fullPage: true });
    await hero.getByRole("link", { name: "Review answers & finish" }).click();
    await expect(page.getByTestId("tab-quiz")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("quiz-score")).toBeVisible();
  });
}

for (const width of [392, 1440]) {
  test(`reading tools stay reachable and selected text becomes an editable tutor draft ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await polishSeed(page);
    let requests = 0;
    await page.route("**/api/tutor", (r) => { requests++; return r.fulfill({ body: "Answer" }); });
    await page.goto("/session/0");
    await page.getByRole("button", { name: "Ask tutor", exact: true }).click();
    const composer = page.getByLabel("Message to the tutor");
    await composer.fill("My own question");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    const paragraph = page.locator("article.reading p").nth(2);
    await paragraph.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 800));
    const selected = (await paragraph.textContent())!.trim();
    await paragraph.evaluate((el) => {
      const range = document.createRange(); range.selectNodeContents(el);
      const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    const ask = page.getByRole("button", { name: "Ask about selection" });
    await expect(ask).toBeVisible();
    const toolbar = await page.getByTestId("reading-toolbar").boundingBox();
    expect(toolbar!.y).toBeGreaterThanOrEqual(0);
    expect(toolbar!.y).toBeLessThan(2);
    await ask.click();
    await expect(composer).toBeVisible();
    await expect(composer).toHaveValue(`My own question\n\n> ${selected}\n\n`);
    expect(requests).toBe(0);
    await mkdir(evidenceDir, { recursive: true });
    await page.screenshot({ path: `${evidenceDir}/quote-${width}.png`, animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("ask-tutor")).toBeFocused();
  });
}

test("a missing quiz offers reading instead of an inaccessible quiz tab", async ({ page }) => {
  const archive = unfinished();
  Object.assign(archive.goals[0].sessions["g_seed:0"], { quiz: undefined, quiz_results: undefined });
  await polishSeed(page, archive);
  await page.goto("/session/0");
  await page.getByTestId("complete-session").click();
  await expect(page.getByRole("dialog")).toContainText("The quiz isn’t ready yet");
  await page.getByRole("button", { name: "Keep reading", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Read", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByTestId("complete-session").click();
  await page.getByTestId("complete-anyway").click();
  await expect(page).toHaveURL(/learning-path/);
  expect((await saved(page)).goals[0].mastery_history).toHaveLength(2);
});

test("search shortcut cannot stack another modal over the tutor", async ({ page }) => {
  await polishSeed(page);
  await page.goto("/learning-path");
  await page.getByRole("button", { name: "Tutor", exact: true }).click();
  await page.keyboard.press("Control+k");
  await expect(page.locator('[role="dialog"]')).toHaveCount(1);
  await expect(page.getByRole("dialog")).toContainText("Tutor");
});

test("a failed tutor reply preserves a new question typed during the request", async ({ page }) => {
  await polishSeed(page);
  let started = false;
  let release!: () => void;
  const pending = new Promise<void>((r) => { release = r; });
  await page.route("**/api/tutor", async (r) => { started = true; await pending; await r.fulfill({ status: 503, json: { error: "Offline" } }); });
  try {
    await page.goto("/session/0");
    await page.getByRole("button", { name: "Ask tutor", exact: true }).click();
    const composer = page.getByLabel("Message to the tutor");
    await composer.fill("First question");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => started).toBe(true);
    await composer.fill("New question while waiting");
    release();
    await expect(composer).toHaveValue("First question\n\nNew question while waiting");
    expect((await saved(page)).goals[0].tutor).toHaveLength(2);
  } finally { release(); }
});

test("long chapters and selected-text tools remain usable on a 320px touch screen", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    const archive = unfinished();
    archive.goals[0].sessions["g_seed:0"].document.markdown = Array.from({ length: 35 }, (_, i) => `## Chapter ${i + 1}\n\n${"Explain a practical example and what to try next. ".repeat(6)}`).join("\n\n");
    await polishSeed(page, archive);
    await page.goto("/session/0");
    await page.locator("summary").filter({ hasText: "Contents" }).click();
    const toc = page.getByTestId("doc-toc").filter({ visible: true });
    expect((await toc.boundingBox())!.height).toBeLessThanOrEqual(320);
    await toc.getByRole("link", { name: "Chapter 30", exact: true }).click();
    const heading = page.getByRole("heading", { name: "Chapter 30", exact: true });
    await expect(heading).toBeInViewport();
    const toolbar = await page.getByTestId("reading-toolbar").boundingBox();
    expect((await heading.boundingBox())!.y).toBeGreaterThan(toolbar!.y + toolbar!.height);
    await heading.evaluate((el) => {
      const range = document.createRange(); range.selectNodeContents(el.nextElementSibling!);
      const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    await expect(page.getByRole("button", { name: "Ask about selection" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.getByTestId("reading-toolbar").boundingBox())!.height).toBeLessThanOrEqual(125);
    const ask = await page.getByTestId("ask-tutor").boundingBox();
    expect(ask!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `${evidenceDir}/reader-320-touch.png`, animations: "disabled" });
  } finally { await context.close(); }
});
