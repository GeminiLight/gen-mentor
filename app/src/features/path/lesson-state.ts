import type { Key } from "@/lib/i18n";
import type { SessionState } from "@/lib/store";

export function lessonState(learned: boolean, state?: SessionState): { label: Key; action: Key; quiz: boolean } {
  if (learned) return { label: "journey.done", action: "path.review", quiz: false };
  if (state?.quiz_results) return { label: "journey.quizReady", action: "journey.finish", quiz: true };
  if (state?.quiz_draft) return { label: "journey.quizStarted", action: "journey.resumeQuiz", quiz: true };
  if (state?.document) return { label: state.opened_at.length ? "journey.reading" : "journey.prepared", action: "journey.resume", quiz: false };
  return { label: "journey.notStarted", action: "journey.start", quiz: false };
}
