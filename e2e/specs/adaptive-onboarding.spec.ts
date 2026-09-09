import { expect, test } from "@playwright/test";
import sample from "../fixtures/agents/sample.json" with { type: "json" };
import { polishSeed, saved } from "./polish-helpers";

test("Adaptive is the default, reaches the scheduler, and saves its chosen path", async ({ page }) => {
  await polishSeed(page);
  await page.route("**/api/refine-goal", (r) => r.fulfill({ json: { refined_goal: sample.learning_goal } }));
  await page.route("**/api/identify-skill-gap", (r) => r.fulfill({ json: { ...sample.skill_gaps, skill_requirements: [] } }));
  await page.route("**/api/profile", (r) => r.fulfill({ json: { learner_profile: sample.learner_profile } }));
  const chosenPath = sample.learning_path.learning_path.slice(0, 3);
  let requestedCount: number | undefined;
  await page.route("**/api/schedule-path", (r) => {
    requestedCount = r.request().postDataJSON().session_count;
    return r.fulfill({ contentType: "text/plain", body: "\n@@final\n" + JSON.stringify({ learning_path: chosenPath }) });
  });
  await page.goto("/onboarding");
  await expect(page.getByLabel("Sessions", { exact: true })).toHaveText("Adaptive");
  await page.getByLabel("Goal", { exact: true }).fill(sample.learning_goal);
  await page.getByLabel("Background", { exact: true }).fill(sample.learner_information);
  await expect(page.getByText("We’ll choose 1–10 sessions based on your goal and skill gaps.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Sessions", { exact: true })).toHaveText("Adaptive");
  await page.getByRole("button", { name: "Build my path" }).click();
  await page.getByRole("button", { name: "Confirm and continue", exact: true }).click();
  await expect(page).toHaveURL(/\/learning-path$/);
  expect(requestedCount).toBe(0);
  expect((await saved(page)).goals.at(-1).learning_path).toEqual(chosenPath);
  await page.goto("/onboarding");
  await expect(page.getByLabel("Sessions", { exact: true })).toHaveText("Adaptive");
});

test("an explicit session count survives a draft reload", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("Sessions", { exact: true }).click();
  await page.getByRole("option", { name: "6 sessions", exact: true }).click();
  await page.getByLabel("Goal", { exact: true }).fill("Learn to analyze sales data");
  await page.reload();
  await expect(page.getByLabel("Sessions", { exact: true })).toHaveText("6 sessions");
  await expect(page.getByText("You can adapt the path as you learn.")).toBeVisible();
});
