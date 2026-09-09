import { expect, test, type Page } from "@playwright/test";
import sample from "../fixtures/agents/sample.json" with { type: "json" };
import { GOAL_ID, seed, STORAGE_KEY } from "./seed";

/**
 * The learner's journeys, end to end, in the browser. Agent calls are replayed from
 * fixtures (see fixtures/llm); the inputs typed here must stay stable for that reason.
 */
test.describe.configure({ timeout: 900_000 });

const archiveOf = (page: Page) => page.evaluate((k) => JSON.parse(window.localStorage.getItem(k) ?? "null"), STORAGE_KEY);

test.describe("onboarding → path", () => {
  test("builds a goal from a typed goal and background", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel("Goal", { exact: true }).fill(sample.learning_goal);
    await page.getByLabel("Background", { exact: true }).fill(sample.learner_information);
    await page.getByRole("button", { name: "Build my path" }).click();
    await expect(page.getByText("Finding the skill gap")).toBeVisible({ timeout: 300_000 });
    await expect(page.getByText("Skill gap", { exact: true })).toBeVisible({ timeout: 300_000 });
    await page.waitForURL("**/learning-path", { timeout: 600_000 });
    const rows = page.getByTestId("session-row");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(page.getByText("Next", { exact: true }).first()).toBeVisible();
    const archive = await archiveOf(page);
    expect(archive.state.goals).toHaveLength(1);
    expect(archive.state.goals[0].mastery_history).toHaveLength(1);
  });
});

test.describe("with a seeded archive", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
  });

  test("goals: the seeded goal is active and can be opened", async ({ page }) => {
    await page.goto("/goals");
    const card = page.getByTestId("goal-card");
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute("data-active", "true");
    await card.getByRole("link", { name: "Open", exact: true }).click();
    await page.waitForURL("**/learning-path");
  });

  test("learning path: learned and next sessions are marked", async ({ page }) => {
    await page.goto("/learning-path");
    const rows = page.getByTestId("session-row");
    await expect(rows).toHaveCount(sample.learning_path.learning_path.length);
    await expect(rows.nth(0)).toHaveAttribute("data-learned", "true");
    await expect(rows.nth(1).getByText("Next", { exact: true })).toBeVisible();
  });

  test("session: a stored document renders without any agent call", async ({ page }) => {
    await page.goto("/session/0");
    await expect(page.getByRole("heading", { level: 1, name: sample.learning_path.learning_path[0].title })).toBeVisible();
    await expect(page.getByRole("article")).toContainText("Pandas");
    await expect(page.getByText("Done", { exact: true })).toBeVisible();
  });

  test("session: generating, reading, quizzing and completing the next session", async ({ page }) => {
    await page.goto("/session/1");
    await expect(page.getByText(/Knowledge points/).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("tab", { name: /Quiz/ })).toBeVisible({ timeout: 800_000 });
    await expect(page.getByRole("article")).toContainText(/\w{3,}/);
    await page.getByTestId("tab-quiz").click();
    const radios = page.getByRole("radio");
    const n = await radios.count();
    for (let i = 0; i < n; i++) if (i % 4 === 0) await radios.nth(i).check();
    await page.getByTestId("submit-quiz").click();
    await expect(page.getByTestId("quiz-score")).toBeVisible();
    await page.getByTestId("complete-session").click();
    await page.waitForURL("**/learning-path", { timeout: 300_000 });
    await expect(page.getByTestId("session-row").nth(1)).toHaveAttribute("data-learned", "true");
    const archive = await archiveOf(page);
    const goal = archive.state.goals.find((g: { id: string }) => g.id === GOAL_ID);
    expect(goal.mastery_history.length).toBeGreaterThan(2);
    expect(goal.sessions[`${GOAL_ID}:1`].quiz_results.answered).toBeGreaterThan(0);
  });

  test("library lists generated documents", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByTestId("library-card")).toHaveCount(1);
    await page.getByTestId("library-card").click();
    await page.waitForURL("**/session/0");
  });

  test("progress shows numbers from the archive, not placeholders", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.getByTestId("overall-ring-value")).toHaveText(`${sample.learner_profile.cognitive_status.overall_progress}%`);
    await expect(page.getByTestId("mastery-rings").getByRole("listitem")).toHaveCount(sample.learner_profile.cognitive_status.mastered_skills.length + sample.learner_profile.cognitive_status.in_progress_skills.length);
  });

  test("tutor streams a reply and keeps it in the archive", async ({ page }) => {
    await page.goto("/learning-path");
    await page.getByRole("button", { name: "Tutor", exact: true }).first().click();
    await page.getByLabel("Message to the tutor").fill(sample.messages[0].content);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByTestId("tutor-messages")).toContainText(/loc|iloc/, { timeout: 300_000 });
    await expect.poll(async () => (await archiveOf(page)).state.goals[0].tutor.length, { timeout: 30_000 }).toBe(4);
  });

  test("archive: export then import restores the same state", async ({ page }) => {
    await page.goto("/profile");
    const before = await archiveOf(page);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-archive").click()]);
    const path = await download.path();
    expect(path).toBeTruthy();
    // An empty (not missing) archive, so the seed script does not re-seed on reload.
    await page.evaluate((k) => window.localStorage.setItem(k, JSON.stringify({ state: { goals: [], active_goal_id: null }, version: 0 })), STORAGE_KEY);
    await page.reload();
    await expect(page.getByText("No goal yet")).toBeVisible();
    await page.getByTestId("import-archive").setInputFiles(path!);
    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
    const after = await archiveOf(page);
    expect(after.state.goals).toEqual(before.state.goals);
    expect(after.state.active_goal_id).toBe(before.state.active_goal_id);
  });
});
