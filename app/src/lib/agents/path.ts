/** Learning Path Scheduler: create (Task A), refine from feedback (Task B), reschedule (Task C). */
import type { PromptValue } from "@/lib/prompts/format";
import {
  pathSchedulerCreateTask,
  pathSchedulerRefineTask,
  pathSchedulerRescheduleTask,
  pathSchedulerSystem,
} from "@/lib/prompts/path-scheduler";
import { LearningPath } from "@/lib/schemas";
import { streamJSON } from "./run";

export type PathRequest =
  | { task: "create"; learner_profile: PromptValue; session_count?: number }
  | { task: "refine"; learning_path: PromptValue; feedback: PromptValue }
  | { task: "reschedule"; learner_profile: PromptValue; learning_path: PromptValue; session_count?: number; other_feedback?: PromptValue };

export function schedulePath(req: PathRequest, onDelta?: (d: string) => void) {
  const base = { tier: "smart" as const, system: pathSchedulerSystem };
  switch (req.task) {
    case "create":
      return streamJSON(
        { ...base, task: pathSchedulerCreateTask, vars: { learner_profile: req.learner_profile, session_count: req.session_count ?? 0 } },
        LearningPath,
        onDelta,
      );
    case "refine":
      return streamJSON({ ...base, task: pathSchedulerRefineTask, vars: { learning_path: req.learning_path, feedback: req.feedback } }, LearningPath, onDelta);
    case "reschedule":
      return streamJSON(
        {
          ...base,
          task: pathSchedulerRescheduleTask,
          vars: {
            learner_profile: req.learner_profile,
            learning_path: req.learning_path,
            session_count: req.session_count ?? -1,
            other_feedback: req.other_feedback ?? "",
          },
        },
        LearningPath,
        onDelta,
      );
  }
}
