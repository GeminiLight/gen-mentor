import { describe, expect, it } from "vitest";
import { DocumentQuiz } from "./schemas";
import { configurationObject, sameConfiguration } from "./configuration";
import { emptySelections, judge, questionCount, quizPerformance } from "./quiz";
import { reviewNeed, reviewQuiz } from "./quiz-review";
import { ArchiveSchema } from "./schemas/archive";
import { seedArchive } from "../../../e2e/specs/seed";

export const exercises = {
  ordering_questions: [{ question: "Put the workflow in order", items: ["Publish", "Validate", "Collect"], correct_order: [2, 1, 0], explanation: "Collect before validation; publish last." }],
  configuration_questions: [{ question: "Enable the service on port 8080", starter_configuration: '{"enabled":false,"port":80}', correct_configurations: ['{"enabled":true,"port":8080}'], explanation: "Enable the service and use the required port." }],
};
const quiz = DocumentQuiz.parse(exercises);

describe("hands-on contracts and grading", () => {
  it("rejects duplicate, missing and out-of-range steps, solved starters and invalid configurations", () => {
    for (const correct_order of [[2, 2, 0], [2, 1], [2, 1, 3], [0, 1, 2]]) {
      expect(DocumentQuiz.safeParse({ ordering_questions: [{ ...exercises.ordering_questions[0], correct_order }] }).success).toBe(false);
    }
    for (const starter_configuration of ['[]', 'null', '{', '{"port":8080,"enabled":true}']) {
      expect(DocumentQuiz.safeParse({ configuration_questions: [{ ...exercises.configuration_questions[0], starter_configuration }] }).success).toBe(false);
    }
  });
  it("compares nested JSON values, not presentation, while preserving arrays and primitive types", () => {
    expect(sameConfiguration('{"z":[1,true],"a":{"x":2,"y":3}}', ' { "a": {"y":3,"x":2},"z":[1,true] }')).toBe(true);
    expect(sameConfiguration('{"x":[1,2]}', '{"x":[2,1]}')).toBe(false);
    expect(sameConfiguration('{"x":1}', '{"x":"1"}')).toBe(false);
    expect(sameConfiguration('{"x":1}', '{"x":1,"y":2}')).toBe(false);
    expect(sameConfiguration('{"__proto__":{"x":1}}', '{}')).toBe(false);
    expect(configurationObject('{"x":')).toBeNull();
    expect(configurationObject('{"x":1e999}')).toBeNull();
    expect(sameConfiguration('{"x":1e999}', '{"x":null}')).toBe(false);
  });
  it("does not score unfinished edits and refuses malformed imported answers", () => {
    const sel = emptySelections(quiz);
    sel.ordering = [{ order: [2, 1, 0], confirmed: false }];
    sel.configuration = [{ value: '{"port":8080,"enabled":true}', confirmed: false }];
    expect(judge(quiz, sel).answered).toBe(0);
    sel.ordering = [{ order: [2, 2, 0], confirmed: true }];
    sel.configuration = [{ value: '{', confirmed: true }];
    expect(judge(quiz, sel).answered).toBe(0);
  });
  it("scores confirmed operations and passes actual wrong answers to learning evidence", () => {
    const sel = emptySelections(quiz);
    sel.ordering = [{ order: [2, 1, 0], confirmed: true }];
    sel.configuration = [{ value: '{"enabled":true,"port":80}', confirmed: true }];
    const result = judge(quiz, sel);
    expect(questionCount(quiz)).toBe(2);
    expect(quizPerformance(result, "Service setup")).toMatchObject({ total_answered: 2, total_correct: 1, accuracy: 0.5 });
    expect(result.wrong_questions[0].expected_answer).toContain('8080');
    const review = reviewQuiz(quiz, result);
    expect(review.keys).toEqual({ "configuration:0": "configuration:0" });
    const corrected = judge(review.quiz, { ...emptySelections(review.quiz), configuration: [{ value: '{"port":8080,"enabled":true}', confirmed: true }] });
    expect(reviewNeed({ opened_at: [], quiz, quiz_results: result, practice: { sourceSubmittedAt: result.submittedAt, results: corrected } }).total).toBe(0);
    expect(result.correct).toBe(1);
  });
  it("round-trips new questions, unfinished drafts and results without breaking v1 archives", () => {
    const archive = seedArchive();
    expect(ArchiveSchema.safeParse(archive).success).toBe(true);
    const selections = emptySelections(quiz);
    selections.configuration![0].value = '{"unfinished":';
    Object.assign(archive.goals[0].sessions['g_seed:0'], { quiz, quiz_results: judge(quiz, selections), quiz_draft: { selections, order: [] } });
    const restored = ArchiveSchema.parse(JSON.parse(JSON.stringify(archive)));
    expect(restored.goals[0].sessions['g_seed:0'].quiz_draft?.selections.configuration?.[0].value).toBe('{"unfinished":');
    expect(restored.goals[0].sessions['g_seed:0'].quiz).toEqual(quiz);
  });
});
