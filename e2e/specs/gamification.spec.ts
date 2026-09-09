import { expect, test } from "@playwright/test";
import { seed, seedArchive, STORAGE_KEY } from "./seed";

/**
 * Gamification must be backed by records. With an empty archive every component shows an
 * honest empty state; with the seeded archive every number equals what the archive holds.
 * Hard-coded placeholder data fails these assertions.
 */
test("empty archive: rings, tree and footprint show empty states, no invented numbers", async ({ page }) => {
  await page.addInitScript((k) => window.localStorage.setItem(k, JSON.stringify({ state: { goals: [], active_goal_id: null }, version: 0 })), STORAGE_KEY);
  await page.goto("/progress");
  await expect(page.getByText("No goal yet")).toBeVisible();
  await expect(page.getByTestId("skill-tree")).toHaveCount(0);
  await expect(page.getByTestId("mastery-line")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/\d+%/);
});

test("seeded archive: every gamified value traces back to the archive", async ({ page }) => {
  await seed(page);
  const archive = seedArchive();
  const goal = archive.goals[0];
  const profile = goal.learner_profile;
  const skills = profile.cognitive_status.mastered_skills.length + profile.cognitive_status.in_progress_skills.length;
  await page.goto("/progress");

  await expect(page.getByTestId("overall-ring-value")).toHaveText(`${profile.cognitive_status.overall_progress}%`);
  await expect(page.getByTestId("stat-mastered")).toHaveText(`${profile.cognitive_status.mastered_skills.length} / ${skills}`);
  await expect(page.getByTestId("stat-sessions")).toHaveText(`1 / ${goal.learning_path.length}`);
  const r = goal.sessions["g_seed:0"].quiz_results;
  await expect(page.getByTestId("stat-accuracy")).toHaveText(`${Math.round((r.correct / r.answered) * 100)}%`);

  const tree = page.getByTestId("skill-tree");
  await expect(tree.getByTestId("skill-node")).toHaveCount(skills);
  const linked = goal.learning_path.flatMap((s) => s.desired_outcome_when_completed).length;
  await expect(tree.getByTestId("session-node")).toHaveCount(linked);
  await expect(tree.locator('[data-testid="session-node"][data-learned="true"]')).toHaveCount(goal.learning_path[0].desired_outcome_when_completed.length);

  await expect(page.getByTestId("mastery-rings").getByRole("listitem")).toHaveCount(skills);
  const label = (l: string) => (l === "unlearned" ? "not started" : l);
  for (const s of profile.cognitive_status.in_progress_skills) {
    await expect(page.getByTestId("mastery-rings")).toContainText(`${label(s.current_proficiency_level)} → ${label(s.required_proficiency_level)}`);
  }
  await expect(page.getByTestId("mastery-line")).toBeVisible();
  await expect(page.getByTestId("minutes-bars")).toBeVisible();
});

test("quiz: verdicts are instant and the streak counts consecutive correct answers", async ({ page }) => {
  await seed(page);
  // Give session 0 a real quiz so the tab has questions to answer.
  await page.addInitScript(
    ([k, quiz]) => {
      const raw = window.localStorage.getItem(k);
      if (!raw) return;
      const data = JSON.parse(raw);
      data.state.goals[0].sessions["g_seed:0"].quiz = quiz;
      delete data.state.goals[0].sessions["g_seed:0"].quiz_results;
      window.localStorage.setItem(k, JSON.stringify(data));
    },
    [STORAGE_KEY, { ...QUIZ, multiple_choice_questions: [], short_answer_questions: [] }] as const,
  );
  await page.goto("/session/0");
  await page.getByTestId("tab-quiz").click();
  const first = page.getByTestId("question").nth(0);
  await first.getByRole("radio").nth(0).check();
  await expect(first).toHaveAttribute("data-verdict", "correct");
  await expect(page.getByTestId("streak")).toContainText("streak");
  const second = page.getByTestId("question").nth(1);
  await second.getByRole("radio").nth(0).check();
  await expect(second).toHaveAttribute("data-verdict", "correct");
  await expect(page.getByTestId("streak")).toContainText("2 in a row");
  const third = page.getByTestId("question").nth(2);
  await third.getByRole("radio").nth(0).check(); // "True" — the statement is false
  await expect(third).toHaveAttribute("data-verdict", "incorrect");
  await expect(page.getByTestId("streak")).toContainText("streak");
  await page.getByTestId("submit-quiz").click();
  await expect(page.getByTestId("quiz-score")).toContainText(/2 of 3 correct/);
});

const QUIZ = {
  single_choice_questions: [
    { question: "Which method previews the first rows of a DataFrame?", options: ["df.head()", "df.tail()", "df.first()", "df.top()"], correct_option: 0, explanation: "head() shows the top rows." },
    { question: "Which call returns column types and non-null counts?", options: ["df.info()", "df.describe()", "df.shape", "df.columns"], correct_option: 0, explanation: "info() is the structural summary." },
  ],
  true_false_questions: [{ question: "iloc selects by label.", correct_answer: false, explanation: "iloc is positional; loc is by label." }],
};
