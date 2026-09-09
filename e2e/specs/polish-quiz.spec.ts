import { expect, test } from "@playwright/test";
import { seedArchive } from "./seed";
import { polishSeed, saved } from "./polish-helpers";

const choiceQuiz = {
  single_choice_questions: [],
  multiple_choice_questions: [{ question: "Choose the even numbers", options: ["2", "4", "3"], correct_options: [0, 1], explanation: "2 and 4 are even." }],
  true_false_questions: [], short_answer_questions: [],
};

test("multiple choice remains editable until confirmation and remembers the verdict", async ({ page }) => {
  const archive = seedArchive();
  const state = archive.goals[0].sessions["g_seed:0"];
  Object.assign(state, { quiz: choiceQuiz, quiz_results: undefined });
  await polishSeed(page, archive);
  await page.goto("/session/0");
  await page.getByTestId("tab-quiz").click();
  await page.getByRole("checkbox").nth(0).check();
  await expect(page.getByRole("checkbox").nth(1)).toBeEnabled();
  await expect(page.getByTestId("question")).not.toHaveAttribute("data-verdict", "incorrect");
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByTestId("question")).toHaveAttribute("data-verdict", "correct");
  await page.getByRole("tab", { name: "Read", exact: true }).click();
  await page.getByTestId("tab-quiz").click();
  await expect(page.getByRole("checkbox").nth(1)).toBeChecked();
  await expect(page.getByRole("checkbox").nth(1)).toBeDisabled();
  await page.reload();
  await page.getByTestId("tab-quiz").click();
  await expect(page.getByRole("checkbox").nth(0)).toBeChecked();
  await expect(page.getByTestId("question")).toHaveAttribute("data-verdict", "correct");
});

test("short answers persist across reading and are not presented as incorrect scores", async ({ page }) => {
  const archive = seedArchive();
  Object.assign(archive.goals[0].sessions["g_seed:0"], { quiz_results: undefined, quiz: {
    ...choiceQuiz, multiple_choice_questions: [], short_answer_questions: [{ question: "What is 2 + 2?", expected_answer: "4" }],
  } });
  await polishSeed(page, archive);
  await page.goto("/session/0");
  await page.getByTestId("tab-quiz").click();
  await page.getByRole("textbox", { name: "Answer to question 1" }).fill("4");
  await page.getByRole("tab", { name: "Read", exact: true }).click();
  await page.getByTestId("tab-quiz").click();
  await expect(page.getByRole("textbox", { name: "Answer to question 1" })).toHaveValue("4");
  await page.getByTestId("submit-quiz").click();
  await expect(page.getByTestId("quiz-score")).toContainText("1 answer(s) for self-review");
  await expect(page.getByTestId("quiz-score")).not.toContainText("0 of 1");
  await page.goto("/progress");
  await expect(page.getByTestId("stat-accuracy")).toHaveText("—");
});

test("partial submission explains coverage and requires a deliberate confirmation", async ({ page }) => {
  const archive = seedArchive();
  Object.assign(archive.goals[0].sessions["g_seed:0"], { quiz_results: undefined });
  await polishSeed(page, archive);
  await page.goto("/session/0");
  await page.getByTestId("tab-quiz").click();
  await page.getByRole("radio").first().check();
  await page.getByTestId("submit-quiz").click();
  await expect(page.locator("main").getByRole("alert")).toContainText("3 question(s)");
  expect((await saved(page)).goals[0].sessions["g_seed:0"].quiz_results).toBeUndefined();
  await page.getByRole("button", { name: "Submit these answers" }).click();
  await expect(page.getByTestId("quiz-score")).toContainText("Answered 1 of 4");
});

test("a quiz outage does not block the saved reading", async ({ page }) => {
  const archive = seedArchive();
  Object.assign(archive.goals[0].sessions["g_seed:0"], { quiz: undefined, quiz_results: undefined });
  await polishSeed(page, archive);
  await page.goto("/session/0");
  await expect(page.getByRole("article")).toContainText("Pandas");
  await expect(page.getByText("Your reading is saved. Try preparing the quiz again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
});

test("reading stays available but regeneration waits for the pending quiz", async ({ page }) => {
  const archive = seedArchive();
  Object.assign(archive.goals[0].sessions["g_seed:0"], { quiz: undefined, quiz_results: undefined });
  await polishSeed(page, archive);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/generate-quiz", async (route) => {
    requests++;
    await pending;
    await route.fulfill({ json: { document_quiz: choiceQuiz } });
  });
  try {
    await page.goto("/session/0");
    await expect.poll(() => requests).toBe(1);
    await expect(page.getByRole("article")).toContainText("Pandas");
    await page.locator("summary").filter({ has: page.locator("svg.lucide-ellipsis") }).click();
    await expect(page.getByRole("button", { name: "Regenerate", exact: true })).toBeDisabled();
    release();
    await expect(page.getByTestId("tab-quiz")).toBeEnabled();
    await expect(page.getByRole("button", { name: "Regenerate", exact: true })).toBeEnabled();
    expect(requests).toBe(1);
  } finally { release(); }
});
