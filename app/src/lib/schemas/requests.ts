/** Request bodies for every POST route. The browser client imports these too, so the two
 *  sides cannot drift. `Json` accepts any structured value the prompts will stringify. */
import { z } from "zod";
import { QuizCounts } from "./assessment";
import { KnowledgeDraft, KnowledgePoint } from "./content";
import { SkillRequirements } from "./learning";
import { ChatHistory } from "./tutoring";

export const Json = z.union([z.string(), z.number(), z.boolean(), z.null(), z.record(z.string(), z.unknown()), z.array(z.unknown())]);
const Text = z.string().trim().min(1);

export const RefineGoalRequest = z.object({ learning_goal: Text, learner_information: z.string().default("") });

export const IdentifySkillGapRequest = z.object({
  learning_goal: Text,
  learner_information: Text,
  skill_requirements: SkillRequirements.nullish(),
});

export const ProfileRequest = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("init"), learning_goal: Text, learner_information: Json, skill_gaps: Json }),
  z.object({
    mode: z.literal("update"),
    learner_profile: Json,
    learner_interactions: Json,
    learner_information: Json.optional(),
    session_information: Json.optional(),
  }),
]);

export const SchedulePathRequest = z.discriminatedUnion("task", [
  z.object({ task: z.literal("create"), learner_profile: Json, session_count: z.number().int().optional() }),
  z.object({ task: z.literal("refine"), learning_path: Json, feedback: Json }),
  z.object({
    task: z.literal("reschedule"),
    learner_profile: Json,
    learning_path: Json,
    session_count: z.number().int().optional(),
    other_feedback: Json.optional(),
  }),
]);

export const ExploreKnowledgeRequest = z.object({ learner_profile: Json, learning_path: Json, learning_session: Json });

export const DraftKnowledgeRequest = z.object({
  learner_profile: Json,
  learning_session: Json,
  knowledge_point: z.union([KnowledgePoint, Text]),
  external_resources: z.string().optional(),
  use_search: z.boolean().default(true),
});

export const IntegrateDocumentRequest = z.object({
  learner_profile: Json,
  learning_path: Json,
  learning_session: Json,
  knowledge_points: z.array(KnowledgePoint),
  knowledge_drafts: z.array(KnowledgeDraft),
});

export const GenerateQuizRequest = QuizCounts.extend({ learner_profile: Json, learning_document: Json });

export const SimulateFeedbackRequest = z.discriminatedUnion("target", [
  z.object({ target: z.literal("path"), learner_profile: Json, learning_path: Json }),
  z.object({ target: z.literal("content"), learner_profile: Json, learning_content: Json }),
]);

export const TutorRequest = z.object({
  messages: ChatHistory,
  learner_profile: Json.optional(),
  external_resources: z.string().optional(),
  use_search: z.boolean().default(false),
});
