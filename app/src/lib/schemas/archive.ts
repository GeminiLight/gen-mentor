import { z } from "zod";
import { LearnerProfile, SkillRequirement, SkillGap } from "./learning";
import { DocumentQuiz } from "./assessment";
import { DocumentStructure, KnowledgeDraft, KnowledgePoint, SessionItem } from "./content";
import { ChatTurn } from "./tutoring";

const Timestamp = z.number().finite().nonnegative();
const Selections = z.object({
  single: z.array(z.number().int().nonnegative().nullable()),
  multiple: z.array(z.array(z.number().int().nonnegative())),
  tf: z.array(z.boolean().nullable()),
  short: z.array(z.string()),
});
const Results = z.object({
  answered: z.number().int().nonnegative(), correct: z.number().int().nonnegative(),
  wrong_questions: z.array(z.object({ question: z.string(), expected_answer: z.string() })),
  verdicts: z.record(z.string(), z.enum(["correct", "incorrect", "unanswered", "answered"])),
  selections: Selections.optional(), submittedAt: Timestamp,
}).refine((r) => r.correct <= r.answered);
const Session = z.object({
  opened_at: z.array(Timestamp), completed_at: Timestamp.optional(),
  knowledge_points: z.array(KnowledgePoint).optional(), knowledge_drafts: z.array(KnowledgeDraft).optional(),
  document: z.object({ structure: DocumentStructure, markdown: z.string() }).optional(),
  quiz: DocumentQuiz.optional(), quiz_results: Results.optional(),
  quiz_draft: z.object({ selections: Selections, order: z.array(z.string()) }).optional(),
  reading_anchor: z.string().optional(),
});
const Goal = z.object({
  id: z.string().min(1).refine((s) => !s.includes(":")), created_at: Timestamp,
  original_goal: z.string(), learning_goal: z.string(), learner_information: z.string(),
  skill_requirements: z.array(SkillRequirement), skill_gaps: z.array(SkillGap),
  learner_profile: LearnerProfile, learning_path: z.array(SessionItem),
  sessions: z.record(z.string(), Session),
  mastery_history: z.array(z.object({ ts: Timestamp, rate: z.number().min(0).max(1), overall_progress: z.number().min(0).max(100) })),
  tutor: z.array(ChatTurn),
}).refine((g) => Object.keys(g.sessions).every((uid) => {
  const index = Number(uid.slice(g.id.length + 1));
  return uid.startsWith(`${g.id}:`) && Number.isInteger(index) && index >= 0 && index < g.learning_path.length;
}), "Invalid session reference");

export const ArchiveSchema = z.object({
  version: z.literal(1), exported_at: Timestamp, active_goal_id: z.string().nullable(), goals: z.array(Goal),
}).refine((a) => new Set(a.goals.map((g) => g.id)).size === a.goals.length, "Duplicate goals")
  .refine((a) => a.active_goal_id === null || a.goals.some((g) => g.id === a.active_goal_id), "Unknown active goal");
