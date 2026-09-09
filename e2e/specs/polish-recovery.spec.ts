import { expect, test } from "@playwright/test";
import { seedArchive } from "./seed";
import { polishSeed, saved } from "./polish-helpers";

test("reordering unfinished sessions moves the corresponding document and quiz", async ({ page }) => {
  const archive = seedArchive();
  Object.assign(archive.goals[0].sessions, { "g_seed:1": structuredClone(archive.goals[0].sessions["g_seed:0"]) });
  const next = structuredClone(archive.goals[0].learning_path);
  [next[1], next[2]] = [next[2], next[1]];
  await polishSeed(page, archive);
  await page.route("**/api/schedule-path", (r) => r.fulfill({ contentType: "text/plain", body: "\n@@final\n" + JSON.stringify({ learning_path: next }) }));
  await page.goto("/learning-path");
  await page.getByRole("button", { name: "Replan", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Replan", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const goal = (await saved(page)).goals[0];
  expect(goal.sessions["g_seed:1"]).toBeUndefined();
  expect(goal.sessions["g_seed:2"].document.structure.title).toContain("Pandas");
  await page.goto("/session/2");
  await expect(page.locator("main h1")).toHaveText("Working with Pandas DataFrames");
  await expect(page.getByRole("article")).toContainText("Pandas");
});

test("archive replacement can be canceled and incomplete files never overwrite data", async ({ page }) => {
  await polishSeed(page);
  await page.goto("/profile");
  const before = await saved(page);
  const incoming = seedArchive();
  incoming.goals[0].learning_goal = "A new imported goal";
  await page.getByTestId("import-archive").setInputFiles({ name: "archive.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(incoming)) });
  await expect(page.getByRole("dialog")).toContainText("Replace the learning archive?");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await saved(page)).toEqual(before);
  await page.getByTestId("import-archive").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ version: 1, active_goal_id: "bad", goals: [{ id: "bad", learner_profile: {}, learning_path: [] }] })) });
  await expect(page.getByText("This file is incomplete or invalid. Your existing data has not changed.")).toBeVisible();
  expect(await saved(page)).toEqual(before);
});

test("onboarding inputs survive a refresh", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("Goal", { exact: true }).fill("Learn to analyze my team's sales data");
  await page.getByLabel("Background", { exact: true }).fill("I use spreadsheets and can study for half an hour a day.");
  await page.reload();
  await expect(page.getByLabel("Goal", { exact: true })).toHaveValue("Learn to analyze my team's sales data");
  await expect(page.getByLabel("Background", { exact: true })).toHaveValue("I use spreadsheets and can study for half an hour a day.");
});

test("IME confirmation does not send and clearing conversation can be canceled", async ({ page }) => {
  await polishSeed(page);
  let sends = 0;
  await page.route("**/api/tutor", (r) => { sends++; return r.fulfill({ body: "Reply", contentType: "text/plain" }); });
  await page.goto("/session/0");
  await page.getByRole("button", { name: "Tutor", exact: true }).click();
  await page.getByLabel("Message to the tutor").fill("正在选择中文候选词");
  await page.getByLabel("Message to the tutor").dispatchEvent("keydown", { key: "Enter", isComposing: true });
  await expect(page.getByLabel("Message to the tutor")).toHaveValue("正在选择中文候选词");
  expect(sends).toBe(0);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Clear this conversation?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await saved(page)).goals[0].tutor).toHaveLength(2);
});

test("an abandoned onboarding request cannot overwrite a newer draft", async ({ page }) => {
  await polishSeed(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let started = false;
  let gapRequests = 0;
  await page.route("**/api/refine-goal", async (route) => {
    started = true;
    await pending;
    await route.fulfill({ json: { refined_goal: "The abandoned goal" } });
  });
  await page.route("**/api/identify-skill-gap", (route) => { gapRequests++; return route.fulfill({ status: 503 }); });
  try {
    await page.goto("/onboarding");
    await page.getByLabel("Goal", { exact: true }).fill("Learn data analysis for work");
    await page.getByLabel("Background", { exact: true }).fill("I use spreadsheets every day.");
    await page.locator("form button[type=submit]").click();
    await expect.poll(() => started).toBe(true);
    await page.getByRole("link", { name: "GenMentor", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await page.getByLabel("Goal", { exact: true }).fill("My newer learning goal");
    const response = page.waitForResponse("**/api/refine-goal");
    release();
    await response;
    await page.waitForTimeout(200);
    await expect(page.getByLabel("Goal", { exact: true })).toHaveValue("My newer learning goal");
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("genmentor.onboarding.v1")!).state);
    expect(draft.checkpoint).toBeNull();
    expect(gapRequests).toBe(0);
  } finally { release(); }
});
