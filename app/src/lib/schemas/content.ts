/** Learning path, knowledge points, drafts, integrated document, outline, feedback. */
import { z } from "zod";
import { envelope, RequiredLevel } from "./levels";

export const DesiredOutcome = z.object({ name: z.string(), level: RequiredLevel });

export const SessionItem = z.object({
  id: z.string(),
  title: z.string(),
  abstract: z.string(),
  if_learned: z.boolean(),
  associated_skills: z
    .array(z.unknown())
    .default([])
    .transform((v) => v.map((x) => String(x).trim()).filter(Boolean)),
  desired_outcome_when_completed: z.array(DesiredOutcome).default([]),
});
export type SessionItem = z.infer<typeof SessionItem>;

/** Over-long paths are truncated to ten (learned sessions come first by contract). Empty is an error. */
export const LearningPath = z.preprocess(
  envelope("learning_path"),
  z.object({ learning_path: z.array(SessionItem).min(1, "Learning path must contain at least one session.").transform((v) => v.slice(0, 10)) }),
);
export type LearningPath = z.infer<typeof LearningPath>;

export const KnowledgeType = z.enum(["foundational", "practical", "strategic"]);
export const KnowledgePoint = z.object({ name: z.string(), type: KnowledgeType });
export type KnowledgePoint = z.infer<typeof KnowledgePoint>;
export const KnowledgePoints = z.preprocess(envelope("knowledge_points"), z.object({ knowledge_points: z.array(KnowledgePoint) }));
export type KnowledgePoints = z.infer<typeof KnowledgePoints>;

/** `sources` is machine-generated provenance appended after validation, never emitted by the model. */
export const Source = z.object({ index: z.number().int(), title: z.string(), source: z.string() });
export type Source = z.infer<typeof Source>;
export const KnowledgeDraft = z.object({ title: z.string(), content: z.string(), sources: z.array(Source).default([]) });
export type KnowledgeDraft = z.infer<typeof KnowledgeDraft>;

/** `summary` is the last field the model writes; when the budget runs out it is the one missing. */
export const DocumentStructure = z.object({
  title: z.string(),
  overview: z.string(),
  content: z.string().default(""),
  summary: z.string().default(""),
});
export type DocumentStructure = z.infer<typeof DocumentStructure>;

export const FeedbackDetail = z.object({ progression: z.string(), engagement: z.string(), personalization: z.string() });
export const LearnerFeedback = z.object({ feedback: FeedbackDetail, suggestions: FeedbackDetail });
export type LearnerFeedback = z.infer<typeof LearnerFeedback>;

export const ContentOutline = z.object({
  title: z.string(),
  sections: z.array(z.object({ title: z.string(), summary: z.string() })).default([]),
});
export const LearningContent = z.object({
  title: z.string(),
  overview: z.string(),
  content: z.string(),
  summary: z.string(),
  quizzes: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
});
