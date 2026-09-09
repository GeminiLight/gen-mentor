/** Pure derivations over the store. Everything the UI shows as "progress" comes from here. */
import { scoredCount } from "@/lib/quiz";
import { LEVEL_ORDER, type LearnerProfile } from "@/lib/schemas";
import type { Goal, QuizResults, SessionState, SessionUid } from "./types";

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

export const quizAccuracy = (r: QuizResults | undefined) => (r && scoredCount(r) ? r.correct / scoredCount(r) : null);

export interface ActivitySummary {
  /** Distinct local calendar days with any open or completion. */
  activeDays: number;
  opened: number;
  completed: number;
  /** Mean sitting minutes over completed sessions, or null before the first completion. */
  avgMinutes: number | null;
  lastActive: number | null;
}

/** What the archive actually records about how the learner works; the profile page shows this, not a guess. */
export function activitySummary(goal: Goal): ActivitySummary {
  const states = Object.values(goal.sessions);
  const stamps = states.flatMap((s) => [...s.opened_at, ...(s.completed_at ? [s.completed_at] : [])]);
  const completed = states.filter((s) => s.completed_at);
  const minutes = completed.map(sessionMinutes).filter((m) => m > 0);
  return {
    activeDays: new Set(stamps.map((ts) => new Date(ts).toDateString())).size,
    opened: states.filter((s) => s.opened_at.length > 0).length,
    completed: completed.length,
    avgMinutes: minutes.length ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length) : null,
    lastActive: stamps.length ? Math.max(...stamps) : null,
  };
}
