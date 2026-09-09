/**
 * The learner's archive: zustand + persist in localStorage, exportable as one JSON file.
 * No account and no server copy, by design (AGENTS.md).
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useOnboardingDraft } from "./onboarding-draft";
import type { ChatTurn } from "@/lib/schemas";
import type { Archive, Goal, QuizResults, SessionState, SessionUid } from "./types";

export type { Goal, SessionState, QuizResults } from "./types";

const STORAGE_KEY = "genmentor.archive.v1";
const emptySession = (): SessionState => ({ opened_at: [] });

interface State {
  goals: Goal[];
  active_goal_id: string | null;
  hydrated: boolean;
}

interface Actions {
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, patch: Partial<Goal> | ((g: Goal) => Partial<Goal>)) => void;
  removeGoal: (id: string) => void;
  setActiveGoal: (id: string | null) => void;
  patchSession: (uid: SessionUid, patch: Partial<SessionState> | ((s: SessionState) => Partial<SessionState>)) => void;
  openSession: (uid: SessionUid) => void;
  submitQuiz: (uid: SessionUid, results: QuizResults) => void;
  recordMastery: (goalId: string, rate: number, overall_progress: number) => void;
  appendTutor: (goalId: string, turns: ChatTurn[]) => void;
  clearTutor: (goalId: string) => void;
  exportArchive: () => Archive;
  importArchive: (archive: Archive) => void;
  reset: () => void;
  setHydrated: () => void;
}

const goalOf = (uid: SessionUid) => uid.split(":")[0];

export const useArchive = create<State & Actions>()(
  persist(
    (set, get) => ({
      goals: [],
      active_goal_id: null,
      hydrated: false,

      addGoal: (goal) => set((s) => ({ goals: [...s.goals, goal], active_goal_id: goal.id })),
      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...(typeof patch === "function" ? patch(g) : patch) } : g)) })),
      removeGoal: (id) =>
        set((s) => {
          const goals = s.goals.filter((g) => g.id !== id);
          return { goals, active_goal_id: s.active_goal_id === id ? (goals[0]?.id ?? null) : s.active_goal_id };
        }),
      setActiveGoal: (id) => set({ active_goal_id: id }),

      patchSession: (uid, patch) =>
        get().updateGoal(goalOf(uid), (g) => {
          const current = g.sessions[uid] ?? emptySession();
          return { sessions: { ...g.sessions, [uid]: { ...current, ...(typeof patch === "function" ? patch(current) : patch) } } };
        }),
      openSession: (uid) => get().patchSession(uid, (s) => ({ opened_at: [...s.opened_at, Date.now()] })),
      submitQuiz: (uid, results) => get().patchSession(uid, { quiz_results: results, quiz_draft: undefined }),

      recordMastery: (goalId, rate, overall_progress) =>
        get().updateGoal(goalId, (g) => ({ mastery_history: [...g.mastery_history, { ts: Date.now(), rate, overall_progress }] })),
      appendTutor: (goalId, turns) => get().updateGoal(goalId, (g) => ({ tutor: [...g.tutor, ...turns] })),
      clearTutor: (goalId) => get().updateGoal(goalId, { tutor: [] }),

      exportArchive: () => ({ version: 1, exported_at: Date.now(), active_goal_id: get().active_goal_id, goals: get().goals }),
      importArchive: (archive) => set({ goals: archive.goals, active_goal_id: archive.active_goal_id ?? archive.goals[0]?.id ?? null }),
      reset: () => { set({ goals: [], active_goal_id: null }); useOnboardingDraft.getState().clear(); },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ goals: s.goals, active_goal_id: s.active_goal_id }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

export const useActiveGoal = () => useArchive((s) => s.goals.find((g) => g.id === s.active_goal_id) ?? null);
export const useGoal = (id: string | null | undefined) => useArchive((s) => (id ? (s.goals.find((g) => g.id === id) ?? null) : null));
