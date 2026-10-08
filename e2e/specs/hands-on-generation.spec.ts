import { expect, test } from "@playwright/test";
import input from "../fixtures/agents/hands-on.json" with { type: "json" };
import { DocumentQuiz } from "../../app/src/lib/schemas/assessment";
import { seedArchive } from "./seed";
import { polishSeed, saved } from "./polish-helpers";

test('real generated operation tasks can be answered, saved and reviewed', async ({ request, page }) => {
  test.setTimeout(420_000);
  const response = await request.post('/api/generate-quiz', { data: { ...input, hands_on: true, single_choice_count: 0 }, timeout: 360_000 });
  expect(response.ok(), await response.text()).toBe(true);
  const quiz = DocumentQuiz.parse((await response.json()).document_quiz);
  expect(quiz.ordering_questions).toHaveLength(1);
  expect(quiz.configuration_questions).toHaveLength(1);
  const archive = seedArchive();
  Object.assign(archive.goals[0].sessions['g_seed:0'], { quiz, quiz_results: undefined });
  await polishSeed(page, archive);
  await page.goto('/session/0');
  await page.getByTestId('tab-quiz').click();
  const ordering = quiz.ordering_questions![0];
  const expectedSteps = ordering.correct_order.map((i) => ordering.items[i]);
  expect(expectedSteps).toHaveLength(3);
  expect(expectedSteps[0]).toMatch(/build/i);
  expect(expectedSteps[1]).toMatch(/validat/i);
  expect(expectedSteps[2]).toMatch(/deploy/i);
  const order = ordering.items.map((_, i) => i);
  for (const [position, item] of ordering.correct_order.entries()) {
    let current = order.indexOf(item);
    while (current > position) {
      await page.getByRole('button', { name: `Move ${ordering.items[item]} up`, exact: true }).click();
      [order[current - 1], order[current]] = [order[current], order[current - 1]];
      current--;
    }
  }
  await page.getByRole('button', { name: 'Check order', exact: true }).click();
  // A real learner response to the documented task, independent of the model's answer key.
  await page.getByRole('textbox', { name: 'JSON configuration for question 2' }).fill('{"port":8080,"enabled":true}');
  await page.getByRole('button', { name: 'Check configuration', exact: true }).click();
  await page.getByTestId('submit-quiz').click();
  await expect(page.getByTestId('question').last()).toHaveAttribute('data-verdict', 'correct');
  expect((await saved(page)).goals[0].sessions['g_seed:0'].quiz_results.correct).toBe(2);
  await page.reload();
  await page.getByTestId('tab-quiz').click();
  await expect(page.getByRole('textbox', { name: 'JSON configuration for question 2' })).toBeDisabled();
  await expect(page.getByTestId('question').first()).toHaveAttribute('data-verdict', 'correct');
});

test('invalid hands-on flag is rejected before generation', async ({ request }) => {
  const response = await request.post('/api/generate-quiz', { data: { ...input, hands_on: 'yes' } });
  expect(response.status()).toBe(400);
});

test('conceptual reading does not acquire invented operation tasks', async ({ request }) => {
  test.setTimeout(420_000);
  const response = await request.post('/api/generate-quiz', { data: {
    learner_profile: 'A beginner studying literary concepts. Respond in English.',
    learning_document: 'A metaphor describes one thing as another to suggest a shared quality. In "time is a river", time is compared to flowing water. This sentence does not claim that time is literally water.',
    hands_on: true, single_choice_count: 1,
  }, timeout: 360_000 });
  expect(response.ok(), await response.text()).toBe(true);
  const quiz = DocumentQuiz.parse((await response.json()).document_quiz);
  expect(quiz.single_choice_questions).toHaveLength(1);
  expect(quiz.ordering_questions).toEqual([]);
  expect(quiz.configuration_questions).toEqual([]);
});
