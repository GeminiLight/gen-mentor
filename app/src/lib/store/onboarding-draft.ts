import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LearnerProfile, SkillGaps, SkillRequirements } from "@/lib/schemas";

export interface OnboardingCheckpoint {
  input: { learning_goal: string; learner_information: string; session_count: number };
  done: { refined_goal?: string; gap?: SkillGaps & SkillRequirements; learner_profile?: LearnerProfile };
}
const empty = { goal: "", info: "", count: "5", checkpoint: null as OnboardingCheckpoint | null };
interface Draft {
  goal: string; info: string; count: string; checkpoint: OnboardingCheckpoint | null;
  patch: (values: Partial<typeof empty>) => void;
  clear: () => void;
}
export const useOnboardingDraft = create<Draft>()(persist((set) => ({
  ...empty,
  patch: (values) => set(values),
  clear: () => set(empty),
}), { name: "genmentor.onboarding.v1", storage: createJSONStorage(() => localStorage) }));
