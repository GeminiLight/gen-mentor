import { expect, it } from "vitest";
import { targetProgress, targetSkills } from "./store/learning-evidence";
import { judge, emptySelections, resolveOption } from "./quiz";
import { reviewNeed, reviewQuiz } from "./quiz-review";
import type { Goal, SessionState } from "./store/types";
import { DocumentQuiz, LearnerProfile } from "./schemas";
import sample from "../../../e2e/fixtures/agents/sample.json";

const goal = { skill_requirements: [{ name: "Python", required_level: "intermediate" }, { name: "SQL", required_level: "advanced" }], skill_gaps: [], learner_profile: LearnerProfile.parse(sample.learner_profile) } as unknown as Goal;
it("target attainment ignores the model's arbitrary percentage and honors accepted targets", () => {
  const g = structuredClone(goal);
  g.learner_profile.cognitive_status = { overall_progress: 99, mastered_skills: [{ name: "Python", proficiency_level: "beginner" }, { name: "SQL", proficiency_level: "advanced" }], in_progress_skills: [] };
  expect(targetProgress(g)).toBe(50);
  g.learner_profile.cognitive_status.overall_progress = 2;
  expect(targetProgress(g)).toBe(50);
});
it("normalizes names, deduplicates requirements, and resolves conflicting estimates conservatively", () => {
  const g = structuredClone(goal);
  g.skill_requirements.push({ name: " python ", required_level: "advanced" });
  g.learner_profile.cognitive_status.mastered_skills = [{ name: "Ｐｙｔｈｏｎ", proficiency_level: "advanced" }];
  g.learner_profile.cognitive_status.in_progress_skills = [{ name: "PYTHON", current_proficiency_level: "beginner", required_proficiency_level: "beginner" }];
  expect(targetSkills(g)).toHaveLength(2);
  expect(targetSkills(g)[0]).toMatchObject({ current: "beginner", required: "advanced", mastered: false });
});
it("missing selections remain unanswered and malformed keys cannot create false scores", () => {
  const quiz = DocumentQuiz.parse({ single_choice_questions: [{ question: "q", options: ["a", "b"], correct_option: 0 }], multiple_choice_questions: [{ question: "m", options: ["a", "b"], correct_options: [0, "bad"] }], true_false_questions: [{ question: "tf", correct_answer: true }] });
  const result = judge(quiz, { single: [], multiple: [[0]], tf: [], short: [] });
  expect(result.verdicts).toEqual({ "single:0": "unanswered", "multiple:0": "answered", "tf:0": "unanswered" });
  expect(result.correct).toBe(0);
  expect(resolveOption(["a", "b"], "0garbage")).toBeNull();
});
it("a targeted review keeps original identities and only resolves correctly practised questions", () => {
  const quiz = DocumentQuiz.parse({ single_choice_questions: [0, 1, 2].map((i) => ({ question: `q${i}`, options: ["a", "b"], correct_option: 0 })) });
  const first = judge(quiz, { ...emptySelections(quiz), single: [0, 1, null] });
  const review = reviewQuiz(quiz, first);
  expect(review.keys).toEqual({ "single:0": "single:1", "single:1": "single:2" });
  const state: SessionState = { opened_at: [], quiz, quiz_results: first, practice: { sourceSubmittedAt: first.submittedAt, results: judge(review.quiz, { ...emptySelections(review.quiz), single: [0, null] }) } };
  expect(reviewNeed(state)).toEqual({ incorrect: 0, skipped: 1, total: 1 });
  expect(first.correct).toBe(1);
  state.practice!.sourceSubmittedAt--;
  expect(reviewNeed(state).total).toBe(2);
});

it("answered short-answer practice is self-review, not an endlessly skipped question or a correct score", () => {
  const quiz = DocumentQuiz.parse({ short_answer_questions: [{ question: "Explain a join", expected_answer: "Combines related rows" }] });
  const first = judge(quiz, emptySelections(quiz));
  const state: SessionState = { opened_at: [], quiz, quiz_results: first, practice: { sourceSubmittedAt: first.submittedAt, results: judge(quiz, { ...emptySelections(quiz), short: ["Joins combine tables using shared keys"] }) } };
  expect(reviewNeed(state).total).toBe(0);
  expect(state.practice!.results!.correct).toBe(0);
  expect(state.practice!.results!.verdicts["short:0"]).toBe("answered");
});

it("wrong questions rank before skipped-only lessons and older tied attempts come first", async () => {
  const { reviewQueue } = await import("./quiz-review");
  const quiz = DocumentQuiz.parse({ true_false_questions: [{ question: "q", correct_answer: true }] });
  const wrong = judge(quiz, { ...emptySelections(quiz), tf: [false] });
  const skipped = judge(quiz, emptySelections(quiz));
  const g = { ...structuredClone(goal), id: "g", learning_path: [0, 1, 2].map((i) => ({ id: String(i), title: String(i), abstract: "", if_learned: true, associated_skills: [], desired_outcome_when_completed: [] })), sessions: {
    "g:0": { opened_at: [], quiz, quiz_results: { ...skipped, submittedAt: 1 } },
    "g:1": { opened_at: [], quiz, quiz_results: { ...wrong, submittedAt: 30 } },
    "g:2": { opened_at: [], quiz, quiz_results: { ...wrong, submittedAt: 20 } },
  } };
  expect(reviewQueue(g).map((item) => item.index)).toEqual([2, 1, 0]);
});
