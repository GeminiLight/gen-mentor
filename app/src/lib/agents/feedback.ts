/** Learner Feedback Simulator: role-plays the learner to critique a path (A) or content (B). */
import type { PromptValue } from "@/lib/prompts/format";
import { feedbackSimulatorContentTask, feedbackSimulatorPathTask, feedbackSimulatorSystem } from "@/lib/prompts/feedback-simulator";
import { LearnerFeedback } from "@/lib/schemas";
import { runJSON } from "./run";

export type FeedbackRequest =
  | { target: "path"; learner_profile: PromptValue; learning_path: PromptValue }
  | { target: "content"; learner_profile: PromptValue; learning_content: PromptValue };

export function simulateFeedback(req: FeedbackRequest) {
  const base = { tier: "fast" as const, system: feedbackSimulatorSystem };
  return req.target === "path"
    ? runJSON({ ...base, task: feedbackSimulatorPathTask, vars: { learner_profile: req.learner_profile, learning_path: req.learning_path } }, LearnerFeedback)
    : runJSON({ ...base, task: feedbackSimulatorContentTask, vars: { learner_profile: req.learner_profile, learning_content: req.learning_content } }, LearnerFeedback);
}
