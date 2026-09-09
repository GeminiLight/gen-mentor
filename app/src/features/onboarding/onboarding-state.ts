import type { Key } from "@/lib/i18n";
import type { StageStatus } from "@/components/stage-list";
import type { LearningPath } from "@/lib/schemas";
import type { OnboardingCheckpoint } from "@/lib/store/onboarding-draft";

export type Step = "refine" | "gap" | "profile" | "path";
export type OnboardingInput = OnboardingCheckpoint["input"];
export type Review = NonNullable<OnboardingCheckpoint["review"]>;
export const REVIEW_MS = 3 * 60 * 1000;
export const STEPS: { key: Step; label: Key }[] = [
  { key: "refine", label: "onboarding.stepRefine" },
  { key: "gap", label: "onboarding.stepGap" },
  { key: "profile", label: "onboarding.stepProfile" },
  { key: "path", label: "onboarding.stepPath" },
];
export interface Preview {
  refined_goal?: string;
  gaps?: NonNullable<OnboardingCheckpoint["done"]["gap"]>["skill_gaps"];
  path?: Partial<LearningPath>;
}
export const PENDING: Record<Step, StageStatus> = { refine: "pending", gap: "pending", profile: "pending", path: "pending" };
export const sameInput = (a: OnboardingInput | undefined, b: OnboardingInput) =>
  !!a && a.learning_goal === b.learning_goal && a.learner_information === b.learner_information && a.session_count === b.session_count;
export const progressOf = ({ done }: OnboardingCheckpoint): Record<Step, StageStatus> => ({
  ...PENDING, refine: done.refined_goal ? "done" : "pending", gap: done.gap ? "done" : "pending", profile: done.learner_profile ? "done" : "pending",
});
