import { expect, test } from "@playwright/test";
import { mockReview, startReview, checkpoint } from "./onboarding-review-helpers";
import { saved } from "./polish-helpers";

test("review gates later stages and persists adjusted current and target levels", async ({ page }) => {
  const calls = await mockReview(page);
  await startReview(page);
  expect(calls.profiles).toHaveLength(0);
  expect(calls.paths).toBe(0);
  await page.getByRole("slider", { name: "Agent architecture · Current level", exact: true }).press("End");
  await page.getByRole("slider", { name: "Agent architecture · Target level", exact: true }).press("Home");
  await expect(page.getByText("Target already met")).toBeVisible();
  const deadline = (await checkpoint(page)).review.deadline;
  await page.reload();
  await expect(page.getByRole("slider", { name: "Agent architecture · Current level", exact: true })).toHaveAttribute("aria-valuenow", "3");
  await expect(page.getByRole("slider", { name: "Agent architecture · Target level", exact: true })).toHaveAttribute("aria-valuenow", "1");
  expect((await checkpoint(page)).review.deadline).toBe(deadline);
  await page.getByRole("button", { name: "Confirm and continue", exact: true }).click();
  await expect(page).toHaveURL(/\/learning-path$/);
  expect(calls.profiles).toHaveLength(1);
  expect(calls.paths).toBe(1);
  expect(calls.profiles[0].skill_gaps.skill_gaps[0]).toMatchObject({ current_level: "advanced", required_level: "beginner", is_gap: false });
  const goal = (await saved(page)).goals.at(-1);
  expect(goal.skill_gaps[0]).toMatchObject({ current_level: "advanced", required_level: "beginner", is_gap: false });
  expect(goal.skill_requirements[0].required_level).toBe("beginner");
});

test("the three-minute deadline continues once, using the reviewed data", async ({ page }) => {
  await page.clock.install();
  const calls = await mockReview(page);
  await startReview(page);
  await page.clock.fastForward(179_000);
  expect(calls.profiles).toHaveLength(0);
  await page.clock.fastForward(1_250);
  await expect(page).toHaveURL(/\/learning-path$/);
  await page.clock.fastForward(10_000);
  expect(calls.profiles).toHaveLength(1);
  expect(calls.paths).toBe(1);
});

test("more time extends the deadline and goal editing pauses it across reloads", async ({ page }) => {
  await page.clock.install();
  const calls = await mockReview(page);
  await startReview(page);
  await page.clock.fastForward(170_000);
  await page.getByRole("button", { name: "Give me 3 more minutes" }).click();
  await page.clock.fastForward(20_000);
  expect(calls.profiles).toHaveLength(0);
  await page.getByRole("button", { name: "Edit goal", exact: true }).click();
  await page.getByRole("textbox", { name: "Goal", exact: true }).fill("A different research goal");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Goal", exact: true })).toHaveValue("A different research goal");
  await expect(page.getByText("Automatic continuation paused")).toBeVisible();
  await page.clock.fastForward(200_000);
  expect(calls.profiles).toHaveLength(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByTestId("review-countdown")).toHaveText("3:00");
});

test("saving an edited goal re-analyzes later steps without refining away the user edit", async ({ page }) => {
  const calls = await mockReview(page);
  await startReview(page);
  await page.getByRole("button", { name: "Edit goal", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Goal", exact: true });
  await input.fill(" ");
  await expect(page.getByRole("button", { name: "Save and re-analyze" })).toBeDisabled();
  await input.fill("Design agent evaluation for scientific research");
  await page.getByRole("button", { name: "Save and re-analyze" }).click();
  await expect(page.getByTestId("review-countdown")).toBeVisible();
  expect(calls.refine).toBe(1);
  expect(calls.gaps).toHaveLength(2);
  expect(calls.gaps[1].learning_goal).toBe("Design agent evaluation for scientific research");
  expect(calls.profiles).toHaveLength(0);
  await page.getByRole("button", { name: "Confirm and continue", exact: true }).click();
  await expect(page).toHaveURL(/\/learning-path$/);
  expect(calls.profiles[0].learning_goal).toBe("Design agent evaluation for scientific research");
});

test("a later failure retries from the confirmed levels without repeating review", async ({ page }) => {
  const calls = await mockReview(page, { profileFailures: 1 });
  await startReview(page);
  await page.getByRole("slider", { name: "Agent architecture · Current level", exact: true }).press("End");
  await page.getByRole("button", { name: "Confirm and continue", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please retry" })).toBeVisible();
  await page.getByTestId("onboarding-retry").click();
  await expect(page).toHaveURL(/\/learning-path$/);
  expect(calls.gaps).toHaveLength(1);
  expect(calls.profiles).toHaveLength(2);
  expect(calls.profiles[1].skill_gaps.skill_gaps[0].current_level).toBe("advanced");
});

test("a late skill analysis cannot replace the revised goal's analysis", async ({ page }) => {
  const calls = await mockReview(page);
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  let gapCount = 0;
  await page.route("**/api/identify-skill-gap", async (r) => {
    const first = ++gapCount === 1;
    if (first) await delayed;
    const name = first ? "Stale skill" : "Revised skill";
    await r.fulfill({ json: { skill_requirements: [{ name, required_level: "advanced" }], skill_gaps: [{ name, current_level: "beginner", required_level: "advanced", is_gap: true, level_confidence: "medium", reason: "Practice needed" }] } });
  });
  try {
    await page.goto("/onboarding");
    await page.getByLabel("Goal", { exact: true }).fill("Build research tools");
    await page.getByLabel("Background", { exact: true }).fill("I know Python.");
    await page.getByRole("button", { name: "Build my path" }).click();
    await expect.poll(() => gapCount).toBe(1);
    await page.getByRole("button", { name: "Edit goal", exact: true }).click();
    await page.getByRole("textbox", { name: "Goal", exact: true }).fill("Evaluate research tools");
    await page.getByRole("button", { name: "Save and re-analyze" }).click();
    await expect(page.getByRole("heading", { name: "Revised skill" })).toBeVisible();
    const response = page.waitForResponse("**/api/identify-skill-gap");
    release(); await response;
    await page.waitForTimeout(100);
    await expect(page.getByRole("heading", { name: "Stale skill" })).toHaveCount(0);
    expect((await checkpoint(page)).done.gap.skill_gaps[0].name).toBe("Revised skill");
    expect(calls.profiles).toHaveLength(0);
  } finally { release(); }
});
