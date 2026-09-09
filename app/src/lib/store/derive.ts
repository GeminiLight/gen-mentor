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

/** Minutes spent, from open timestamps to completion (or to the last open). */
export function sessionMinutes(state: SessionState | undefined): number {
  if (!state || state.opened_at.length === 0) return 0;
  const start = state.opened_at[0];
  const end = state.completed_at ?? state.opened_at.at(-1) ?? start;
  return Math.max(0, Math.round((end - start) / 60_000));
}

export function totalMinutes(goal: Goal): number {
  return Object.values(goal.sessions).reduce((acc, s) => acc + sessionMinutes(s), 0);
}

export const quizAccuracy = (r: { answered: number; correct: number } | undefined) => (r && r.answered ? r.correct / r.answered : null);
