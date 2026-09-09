/** Everything GenMentor remembers about a learner lives here, on the device. */
import type { Selections } from "@/lib/quiz";
import type { DocumentQuiz, DocumentStructure, KnowledgeDraft, KnowledgePoint, LearnerProfile, LearningPath, SkillGaps, SkillRequirements, ChatTurn } from "@/lib/schemas";

export type SessionId = string;
/** `${goalId}:${sessionIndex}` */
export type SessionUid = string;

export interface QuizResults {
  answered: number;
  correct: number;
  /** Questions answered wrongly, handed to the profiler as evidence. */
  wrong_questions: { question: string; expected_answer: string }[];
  /** Per-question verdicts, aligned with the quiz lists. */
  verdicts: Record<string, "correct" | "incorrect" | "unanswered" | "answered">;
  /** What the learner picked, so the finished quiz can show their answers, not just the right ones. */
  selections?: Selections;
  submittedAt: number;
}

export interface QuizDraft {
  selections: Selections;
  order: string[];
}

export interface SessionState {
  quiz_draft?: QuizDraft;
  reading_anchor?: string;
  knowledge_points?: KnowledgePoint[];
  knowledge_drafts?: KnowledgeDraft[];
  document?: { structure: DocumentStructure; markdown: string };
  quiz?: DocumentQuiz;
  quiz_results?: QuizResults;
  /** Each time the learner opens the session, plus when they complete it. */
  opened_at: number[];
  completed_at?: number;
}

export interface MasteryPoint {
  ts: number;
  /** mastered / (mastered + in progress), from the profile at that moment. */
  rate: number;
  overall_progress: number;
}

export interface Goal {
  id: string;
  created_at: number;
  original_goal: string;
  learning_goal: string;
  learner_information: string;
  skill_requirements: SkillRequirements["skill_requirements"];
  skill_gaps: SkillGaps["skill_gaps"];
  learner_profile: LearnerProfile;
  learning_path: LearningPath["learning_path"];
  sessions: Record<SessionUid, SessionState>;
  mastery_history: MasteryPoint[];
  tutor: ChatTurn[];
}

export interface Archive {
  version: 1;
  exported_at: number;
  active_goal_id: string | null;
  goals: Goal[];
}
