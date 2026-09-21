import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { seedArchive } from "./seed";
import { polishSeed, saved } from "./polish-helpers";

const exercises = {
  single_choice_questions: [], multiple_choice_questions: [], true_false_questions: [], short_answer_questions: [],
  ordering_questions: [{ question: "Arrange the release workflow", items: ["Publish the release", "Run validation", "Collect the changes"], correct_order: [2, 1, 0], explanation: "Collect changes, validate them, then publish." }],
  configuration_questions: [{ question: "Enable the service and set its port to 8080. Keep only these two fields.", starter_configuration: '{"enabled":false,"port":80}', correct_configurations: ['{"enabled":true,"port":8080}'], explanation: "The service must be enabled and listen on port 8080." }],
};
async function setup(page: Parameters<typeof polishSeed>[0]) {
  const archive = seedArchive();
  Object.assign(archive.goals[0].sessions['g_seed:0'], { quiz: exercises, quiz_results: undefined });
  await polishSeed(page, archive);
  await page.goto('/session/0');
  await page.getByTestId('tab-quiz').click();
}

test('hands-on drafts, keyboard order, JSON validation, review and first score persist', async ({ page }) => {
  await setup(page);
  const ordering = page.getByTestId('question').first();
  const editor = page.getByRole('textbox', { name: 'JSON configuration for question 2' });
  await editor.fill('{"enabled":');
  await page.getByRole('button', { name: 'Check configuration', exact: true }).click();
  await expect(editor).toBeFocused();
  await expect(page.locator('main').getByRole('alert')).toContainText('valid JSON');
  await page.getByRole('button', { name: 'Move Collect the changes up', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(ordering.getByRole('listitem').first()).toContainText('Collect the changes');
  await page.getByRole('button', { name: 'Move Publish the release down', exact: true }).click();
  await page.reload();
  await page.getByTestId('tab-quiz').click();
  await expect(ordering.getByRole('listitem').last()).toContainText('Publish the release');
  await expect(editor).toHaveValue('{"enabled":');
  await expect(ordering).not.toHaveAttribute('data-verdict', 'correct');
  await page.getByRole('button', { name: 'Check order', exact: true }).click();
  await expect(ordering).toHaveAttribute('data-verdict', 'correct');
  await editor.fill('{"port":80,"enabled":true}');
  await page.getByRole('button', { name: 'Check configuration', exact: true }).click();
  await expect(page.getByTestId('question').last()).toHaveAttribute('data-verdict', 'incorrect');
  await page.getByTestId('submit-quiz').click();
  const first = (await saved(page)).goals[0].sessions['g_seed:0'].quiz_results;
  expect(first.correct).toBe(1);
  await page.getByRole('button', { name: 'Practise these questions' }).click();
  await page.getByRole('textbox', { name: 'JSON configuration for question 1' }).fill('{ "port":8080, "enabled":true }');
  await page.getByRole('button', { name: 'Check configuration', exact: true }).click();
  await page.getByTestId('submit-quiz').click();
  const state = (await saved(page)).goals[0].sessions['g_seed:0'];
  expect(state.quiz_results).toEqual(first);
  expect(state.practice.results.correct).toBe(1);
});

test('desktop supports dragging steps without scoring them prematurely', async ({ page }) => {
  await setup(page);
  const list = page.getByRole('list', { name: 'Arrange the steps' });
  await list.getByRole('listitem').last().locator('[draggable]').dragTo(list.getByRole('listitem').first());
  await expect(list.getByRole('listitem').first()).toContainText('Collect the changes');
  await expect(page.getByTestId('question').first()).not.toHaveAttribute('data-verdict', 'incorrect');
  expect((await saved(page)).goals[0].sessions['g_seed:0'].quiz_draft.selections.ordering[0]).toEqual({ order: [2, 0, 1], confirmed: false });
});

for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 1000 }]) {
  for (const theme of ['light', 'dark']) {
    test(`hands-on ${viewport.name} ${theme} is accessible and contained`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript((theme) => localStorage.setItem('theme', theme), theme);
      await setup(page);
      const violations = (await new AxeBuilder({ page }).include('main').analyze()).violations.filter((v) => ['serious','critical'].includes(v.impact ?? ''));
      expect(violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/screenshots/hands-on--${viewport.name}--${theme}.png`, fullPage: true });
    });
  }
}
