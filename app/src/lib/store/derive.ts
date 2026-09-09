/** Pure derivations over the store. Everything the UI shows as "progress" comes from here. */
import { LEVEL_ORDER, type LearnerProfile } from "@/lib/schemas";
import type { Goal, SessionState, SessionUid } from "./types";

export const sessionUid = (goalId: string, index: number): SessionUid => `${goalId}:${index}`;

export function masteryRate(profile: LearnerProfile): number {
  const m = profile.cognitive_status.mastered_skills.length;
  const p = profile.cognitive_status.in_progress_skills.length;
  return m + p === 0 ? 0 : m / (m + p);
}

/** Skills with both required and current levels, mastered first, for radar / tree views. */
export function skillLevels(profile: LearnerProfile) {
  const { mastered_skills, in_progress_skills } = profile.cognitive_status;
  return [
    ...mastered_skills.map((s) => ({ name: s.name, required: s.proficiency_level, current: s.proficiency_level, mastered: true as const })),
    ...in_progress_skills.map((s) => ({
      name: s.name,
      required: s.required_proficiency_level,
      current: s.current_proficiency_level,
      mastered: false as const,
    })),
  ].map((s) => ({ ...s, requiredRank: LEVEL_ORDER[s.required], currentRank: LEVEL_ORDER[s.current] }));
}

export function learnedCount(goal: Goal): number {
  return goal.learning_path.filter((s) => s.if_learned).length;
}

/** A gap longer than this between two timestamps means the learner left; it is not reading time. */
const SITTING_GAP_MS = 90 * 60_000;

/**
 * Minutes spent, summed over sittings. Every open and the completion leave a timestamp;
 * consecutive stamps within one sitting count, a two-day gap between visits does not.
 * Without this a session opened on Monday and finished on Wednesday would claim 2,880 minutes.
 */
export function sessionMinutes(state: SessionState | undefined): number {
  if (!state || state.opened_at.length === 0) return 0;
  const stamps = [...state.opened_at, ...(state.completed_at ? [state.completed_at] : [])].sort((a, b) => a - b);
  let ms = 0;
  for (let i = 1; i < stamps.length; i++) {
    const gap = stamps[i] - stamps[i - 1];
    if (gap <= SITTING_GAP_MS) ms += gap;
  }
  return Math.round(ms / 60_000);
}

export function totalMinutes(goal: Goal): number {
  return Object.values(goal.sessions).reduce((acc, s) => acc + sessionMinutes(s), 0);
}

export const quizAccuracy = (r: { answered: number; correct: number } | undefined) => (r && r.answered ? r.correct / r.answered : null);
