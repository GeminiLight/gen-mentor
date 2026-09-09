/** Adaptive Learner Profiler: initial profiling (Task A) and profile update (Task B). */
import { learnerProfilerInitTask, learnerProfilerSystem, learnerProfilerUpdateTask } from "@/lib/prompts/learner-profiler";
import type { PromptValue } from "@/lib/prompts/format";
import { LearnerProfile } from "@/lib/schemas";
import { runJSON } from "./run";

export function initializeProfile(input: { learning_goal: string; learner_information: PromptValue; skill_gaps: PromptValue }) {
  return runJSON({ tier: "fast", system: learnerProfilerSystem, task: learnerProfilerInitTask, vars: input }, LearnerProfile);
}

export function updateProfile(input: {
  learner_profile: PromptValue;
  learner_interactions: PromptValue;
  learner_information?: PromptValue;
  session_information?: PromptValue;
}) {
  return runJSON(
    {
      tier: "fast",
      system: learnerProfilerSystem,
      task: learnerProfilerUpdateTask,
      vars: {
        learner_profile: input.learner_profile,
        learner_interactions: input.learner_interactions,
        learner_information: input.learner_information ?? "",
        session_information: input.session_information ?? "",
      },
    },
    LearnerProfile,
  );
}
