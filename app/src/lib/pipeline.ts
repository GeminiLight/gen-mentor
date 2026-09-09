/**
 * The session content pipeline, run from the browser so every stage can stream into the
 * page: explore knowledge points → draft each point → integrate the document → quiz.
 * Each finished stage is checkpointed into the archive, so a refresh resumes rather than
 * restarts (the Python frontend did the same with content_pipeline_state).
 */
import { api } from "@/lib/client";
import type { Key } from "@/lib/i18n";
import { parsePartialJSON } from "@/lib/llm/partial-json";
import type { KnowledgeDraft, KnowledgePoint, LearnerProfile, SessionItem } from "@/lib/schemas";
import type { SessionState } from "@/lib/store/types";

export type Stage = "knowledge_points" | "knowledge_drafts" | "document" | "quiz";
export const STAGES: Stage[] = ["knowledge_points", "knowledge_drafts", "document", "quiz"];
export const STAGE_LABELS: Record<Stage, { running: Key; done: Key }> = {
  knowledge_points: { running: "session.stageExploreRun", done: "session.stageExploreDone" },
  knowledge_drafts: { running: "session.stageDraftRun", done: "session.stageDraftDone" },
  document: { running: "session.stageDocRun", done: "session.stageDocDone" },
  quiz: { running: "session.stageQuizRun", done: "session.stageQuizDone" },
};

export interface PipelineInput {
  learner_profile: LearnerProfile;
  learning_path: SessionItem[];
  learning_session: SessionItem;
  state: SessionState;
  use_search: boolean;
}

export interface PipelineEvents {
  onStage: (stage: Stage, status: "running" | "done") => void;
  /** Streamed preview: which point is being drafted and the partial content so far. */
  onDraftDelta: (index: number, partial: Partial<KnowledgeDraft>) => void;
  onDocumentDelta: (partial: { title?: string; overview?: string }) => void;
  onCheckpoint: (patch: Partial<SessionState>) => void;
}

/** First stage whose checkpoint is missing. */
export function nextStage(state: SessionState): Stage | null {
  if (!state.knowledge_points) return "knowledge_points";
  if (!state.knowledge_drafts) return "knowledge_drafts";
  if (!state.document) return "document";
  if (!state.quiz) return "quiz";
  return null;
}

export async function runPipeline(input: PipelineInput, ev: PipelineEvents): Promise<void> {
  const { learner_profile, learning_path, learning_session } = input;
  let state = input.state;
  const checkpoint = (patch: Partial<SessionState>) => {
    state = { ...state, ...patch };
    ev.onCheckpoint(patch);
  };

  let points: KnowledgePoint[] = state.knowledge_points ?? [];
  if (!state.knowledge_points) {
    ev.onStage("knowledge_points", "running");
    points = (await api.exploreKnowledge({ learner_profile, learning_path, learning_session })).knowledge_points;
    checkpoint({ knowledge_points: points });
    ev.onStage("knowledge_points", "done");
  }

  let drafts: KnowledgeDraft[] = state.knowledge_drafts ?? [];
  if (!state.knowledge_drafts) {
    ev.onStage("knowledge_drafts", "running");
    // Drafts are independent; run them together so a five-point session does not wait five times.
    drafts = await Promise.all(
      points.map(async (kp, i) => {
        const { final } = await api.draftKnowledge({ learner_profile, learning_session, knowledge_point: kp, use_search: input.use_search }, (text) => {
          const partial = parsePartialJSON<KnowledgeDraft>(text);
          if (partial) ev.onDraftDelta(i, partial);
        });
        if (!final) throw new Error(`Draft ${i + 1} did not finish`);
        return final;
      }),
    );
    checkpoint({ knowledge_drafts: drafts });
    ev.onStage("knowledge_drafts", "done");
  }

  let document = state.document;
  if (!document) {
    ev.onStage("document", "running");
    const { final } = await api.integrateDocument(
      { learner_profile, learning_path, learning_session, knowledge_points: points, knowledge_drafts: drafts },
      (text) => {
        const partial = parsePartialJSON<{ title?: string; overview?: string }>(text);
        if (partial) ev.onDocumentDelta(partial);
      },
    );
    if (!final) throw new Error("Document integration did not finish");
    document = final;
    checkpoint({ document });
    ev.onStage("document", "done");
  }

  if (!state.quiz) {
    ev.onStage("quiz", "running");
    const { document_quiz } = await api.generateQuiz({ learner_profile, learning_document: document.markdown, single_choice_count: 3, true_false_count: 1 });
    checkpoint({ quiz: document_quiz });
    ev.onStage("quiz", "done");
  }
}
