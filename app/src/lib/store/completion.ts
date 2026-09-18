import { create } from "zustand";
import { api } from "@/lib/client";
import { quizPerformance } from "@/lib/quiz";
import { useArchive } from "./index";
import { masteryRate, sessionUid } from "./derive";
import type { Goal } from "./types";

/** Completion is a local fact. A model estimate must never be its prerequisite. */
export function completeSession(goalId: string, index: number) {
  useArchive.getState().updateGoal(goalId, (goal) => {
    const lesson = goal.learning_path[index];
    if (!lesson || lesson.if_learned) return {};
    const uid = sessionUid(goalId, index);
    const state = goal.sessions[uid] ?? { opened_at: [] };
    const evidence = state.quiz_results;
    return {
      learning_path: goal.learning_path.map((s, i) => i === index ? { ...s, if_learned: true } : s),
      sessions: { ...goal.sessions, [uid]: {
        ...state, completed_at: Date.now(),
        profile_update: evidence && evidence.answered > 0
          ? { id: crypto.randomUUID(), status: "pending" as const, evidence } : undefined,
      } },
    };
  });
}

// Only transient network activity lives here. Recoverable work lives in the exportable archive.
export const useProfileActivity = create<{ running: Record<string, boolean> }>(() => ({ running: {} }));
const goalById = (id: string) => useArchive.getState().goals.find((g) => g.id === id);
const findTask = (g: Goal, id: string) => Object.entries(g.sessions).find(([, s]) => s.profile_update?.id === id);

/** Serial per goal: each assessment builds on the last committed profile. */
export async function refreshProfiles(goalId: string, retryFailed = false) {
  if (useProfileActivity.getState().running[goalId]) return;
  useProfileActivity.setState((s) => ({ running: { ...s.running, [goalId]: true } }));
  try {
    if (retryFailed) useArchive.getState().updateGoal(goalId, (g) => ({ sessions: Object.fromEntries(
      Object.entries(g.sessions).map(([uid, s]) => [uid, s.profile_update ? { ...s, profile_update: { ...s.profile_update, status: "pending" as const } } : s]),
    ) }));
    for (;;) {
      const goal = goalById(goalId);
      const entry = goal && Object.entries(goal.sessions).filter(([, s]) => s.profile_update)
        .sort((a, b) => (a[1].completed_at ?? 0) - (b[1].completed_at ?? 0))[0];
      if (!goal || !entry || entry[1].profile_update?.status !== "pending") break;
      const [uid, state] = entry;
      const task = state.profile_update!;
      const session = goal.learning_path[Number(uid.slice(goalId.length + 1))];
      if (!session) break;
      try {
        const { learner_profile } = await api.profile({
          mode: "update", learner_profile: goal.learner_profile,
          learner_interactions: { quiz_performance: quizPerformance(task.evidence, session.title) },
          session_information: { ...session, if_learned: true },
        });
        useArchive.getState().updateGoal(goalId, (current) => {
          const match = findTask(current, task.id);
          if (!match) return {}; // Removed/imported while the request was running.
          const [currentUid, currentState] = match;
          // A manual profile edit wins over an older in-flight estimate.
          if (current.learner_profile !== goal.learner_profile) return { sessions: {
            ...current.sessions, [currentUid]: { ...currentState, profile_update: { ...task, status: "failed" } },
          } };
          return {
            learner_profile,
            sessions: { ...current.sessions, [currentUid]: { ...currentState, profile_update: undefined } },
            mastery_history: [...current.mastery_history, { ts: Date.now(), rate: masteryRate(learner_profile), overall_progress: learner_profile.cognitive_status.overall_progress }],
          };
        });
      } catch {
        useArchive.getState().updateGoal(goalId, (current) => {
          const match = findTask(current, task.id);
          return match ? { sessions: { ...current.sessions, [match[0]]: { ...match[1], profile_update: { ...task, status: "failed" } } } } : {};
        });
        break;
      }
    }
  } finally {
    useProfileActivity.setState((s) => ({ running: { ...s.running, [goalId]: false } }));
  }
}
