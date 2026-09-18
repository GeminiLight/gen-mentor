import type { DocumentQuiz } from "@/lib/schemas";
import type { Goal, QuizResults, SessionState } from "@/lib/store/types";
import { questionKey, type Selections } from "./quiz";
import { sessionUid } from "./store/derive";

const kinds = { single: "single_choice_questions", multiple: "multiple_choice_questions", tf: "true_false_questions", short: "short_answer_questions" } as const;

/** Retain original keys alongside a compact practice quiz, so partial reviews map back correctly. */
export function reviewQuiz(quiz: DocumentQuiz, results: QuizResults) {
  const keys: Record<string, string> = {};
  const selected = (Object.keys(kinds) as (keyof Selections)[]).map((kind) => {
    const items = quiz[kinds[kind]].filter((_, i) => ["incorrect", "unanswered"].includes(results.verdicts[questionKey(kind, i)]));
    const original = quiz[kinds[kind]].map((_, i) => questionKey(kind, i)).filter((key) => ["incorrect", "unanswered"].includes(results.verdicts[key]));
    original.forEach((key, i) => { keys[questionKey(kind, i)] = key; });
    return [kinds[kind], items];
  });
  return { quiz: Object.fromEntries(selected) as DocumentQuiz, keys };
}

export function reviewNeed(state: SessionState | undefined) {
  if (!state?.quiz || !state.quiz_results) return { incorrect: 0, skipped: 0, total: 0 };
  const { keys } = reviewQuiz(state.quiz, state.quiz_results);
  const review = state.practice?.sourceSubmittedAt === state.quiz_results.submittedAt ? state.practice.results : undefined;
  let incorrect = 0, skipped = 0;
  for (const [compact, original] of Object.entries(keys)) {
    // Repeated exposure is practice, not a replacement for the first assessment.
    if (review?.verdicts[compact] === "correct" || (compact.startsWith("short:") && review?.verdicts[compact] === "answered")) continue;
    if (state.quiz_results.verdicts[original] === "incorrect") incorrect++;
    else skipped++;
  }
  return { incorrect, skipped, total: incorrect + skipped };
}

/** Transparent ordering: wrong answers first, then gaps, then older assessments. No retention claim. */
export function reviewQueue(goal: Goal) {
  return goal.learning_path.map((session, index) => {
    const state = goal.sessions[sessionUid(goal.id, index)];
    return { index, session, ...reviewNeed(state), submittedAt: state?.quiz_results?.submittedAt ?? 0 };
  }).filter((item) => item.total > 0)
    .sort((a, b) => b.incorrect - a.incorrect || b.skipped - a.skipped || a.submittedAt - b.submittedAt || a.index - b.index);
}
