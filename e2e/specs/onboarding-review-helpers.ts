import { expect, type Page } from "@playwright/test";
import sample from "../fixtures/agents/sample.json" with { type: "json" };
import { polishSeed } from "./polish-helpers";

export const reviewGap = {
  skill_requirements: [{ name: "Agent architecture", required_level: "intermediate" }],
  skill_gaps: [{ name: "Agent architecture", current_level: "beginner", required_level: "intermediate", is_gap: true, reason: "Needs practice", level_confidence: "medium" }],
};
export async function mockReview(page: Page, options: { profileFailures?: number; gap?: typeof reviewGap } = {}) {
  await polishSeed(page);
  const calls = { refine: 0, gaps: [] as { learning_goal: string }[], profiles: [] as { learning_goal: string; skill_gaps: typeof reviewGap }[], paths: 0 };
  await page.route("**/api/refine-goal", (r) => { calls.refine++; return r.fulfill({ json: { refined_goal: "Build an AI research assistant" } }); });
  await page.route("**/api/identify-skill-gap", (r) => { calls.gaps.push(r.request().postDataJSON()); return r.fulfill({ json: options.gap ?? reviewGap }); });
  await page.route("**/api/profile", (r) => {
    calls.profiles.push(r.request().postDataJSON());
    if (calls.profiles.length <= (options.profileFailures ?? 0)) return r.fulfill({ status: 503, json: { error: "Please retry" } });
    return r.fulfill({ json: { learner_profile: { ...sample.learner_profile, learning_goal: r.request().postDataJSON().learning_goal } } });
  });
  await page.route("**/api/schedule-path", (r) => {
    calls.paths++;
    return r.fulfill({ contentType: "text/plain", body: "\n@@final\n" + JSON.stringify(sample.learning_path) });
  });
  return calls;
}
export async function startReview(page: Page) {
  await page.goto("/onboarding");
  await page.getByLabel("Goal", { exact: true }).fill("Build an AI research assistant");
  await page.getByLabel("Background", { exact: true }).fill("I know Python and am learning agents.");
  await page.getByRole("button", { name: "Build my path", exact: true }).click();
  await expect(page.getByTestId("review-controls")).toBeVisible();
}
export const checkpoint = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("genmentor.onboarding.v1")!).state.checkpoint);
