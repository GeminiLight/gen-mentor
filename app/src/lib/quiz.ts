/**
 * Quiz judging, ported from the Streamlit view. Short answers cannot be auto-scored and
 * count as answered only; unanswered questions are not counted. Wrong answers are kept
 * as evidence for the profiler.
 */
import type { DocumentQuiz } from "@/lib/schemas";
import type { QuizResults } from "@/lib/store/types";

export type Verdict = "correct" | "incorrect" | "unanswered" | "answered";

export interface Selections {
  single: (number | null)[];
  multiple: number[][];
  tf: (boolean | null)[];
  short: string[];
}

export const emptySelections = (quiz: DocumentQuiz): Selections => ({
  single: quiz.single_choice_questions.map(() => null),
  multiple: quiz.multiple_choice_questions.map(() => []),
  tf: quiz.true_false_questions.map(() => null),
  short: quiz.short_answer_questions.map(() => ""),
});

/** `correct_option` arrives as an index, a letter or the option text. Resolve to an index. */
export function resolveOption(options: string[], correct: number | string): number | null {
  if (typeof correct === "number") return correct >= 0 && correct < options.length ? correct : null;
  const s = correct.trim();
  const letter = "ABCDEFGH".indexOf(s.toUpperCase());
  if (s.length === 1 && letter !== -1 && letter < options.length) return letter;
  const byText = options.indexOf(s);
  if (byText !== -1) return byText;
  const n = Number.parseInt(s, 10);
  return Number.isInteger(n) && n >= 0 && n < options.length ? n : null;
}

export const questionKey = (kind: keyof Selections, i: number) => `${kind}:${i}`;

export function judge(quiz: DocumentQuiz, sel: Selections): QuizResults {
  const r: QuizResults = { answered: 0, correct: 0, wrong_questions: [], verdicts: {}, submittedAt: Date.now() };
  const mark = (key: string, answered: boolean, correct: boolean | null, question: string, expected: string) => {
    if (!answered) {
      r.verdicts[key] = "unanswered";
      return;
    }
    r.answered += 1;
    if (correct === null) r.verdicts[key] = "answered";
    else if (correct) {
      r.correct += 1;
      r.verdicts[key] = "correct";
    } else {
      r.verdicts[key] = "incorrect";
      r.wrong_questions.push({ question, expected_answer: expected });
    }
  };

  quiz.single_choice_questions.forEach((q, i) => {
    const want = resolveOption(q.options, q.correct_option);
    const got = sel.single[i];
    mark(questionKey("single", i), got !== null, want === null ? null : got === want, q.question, want === null ? String(q.correct_option) : q.options[want]);
  });
  quiz.multiple_choice_questions.forEach((q, i) => {
    const want = q.correct_options.map((c) => resolveOption(q.options, c)).filter((x): x is number => x !== null).sort();
    const got = [...(sel.multiple[i] ?? [])].sort();
    mark(questionKey("multiple", i), got.length > 0, want.length === got.length && want.every((v, k) => v === got[k]), q.question, want.map((w) => q.options[w]).join(", "));
  });
  quiz.true_false_questions.forEach((q, i) => {
    const got = sel.tf[i];
    mark(questionKey("tf", i), got !== null, got === q.correct_answer, q.question, q.correct_answer ? "True" : "False");
  });
  quiz.short_answer_questions.forEach((q, i) => {
    mark(questionKey("short", i), (sel.short[i] ?? "").trim().length > 0, null, q.question, q.expected_answer);
  });
  return r;
}

/** The `quiz_performance` object merged into `learner_interactions` for the profiler. */
export function quizPerformance(results: QuizResults, session_title: string) {
  return {
    session_title,
    total_answered: results.answered,
    total_correct: results.correct,
    accuracy: results.answered ? Math.round((results.correct / results.answered) * 100) / 100 : 0,
    wrong_questions: results.wrong_questions,
  };
}
