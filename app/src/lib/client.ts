/**
 * Browser-side API client. Every call to /api goes through here so the streaming
 * protocol (`@@final` / `@@error`) and error shaping live in one place.
 */
import type { z } from "zod";
import type {
  DraftKnowledgeRequest,
  ExploreKnowledgeRequest,
  GenerateQuizRequest,
  IdentifySkillGapRequest,
  IntegrateDocumentRequest,
  ProfileRequest,
  RefineGoalRequest,
  SchedulePathRequest,
  SimulateFeedbackRequest,
  TutorRequest,
} from "@/lib/schemas";
import type {
  DocumentQuiz,
  DocumentStructure,
  KnowledgeDraft,
  KnowledgePoints,
  LearnerFeedback,
  LearnerProfile,
  LearningPath,
  RefinedGoal,
  SkillGaps,
  SkillRequirements,
} from "@/lib/schemas";

export interface Health {
  ok: boolean;
  provider: "openai" | "anthropic";
  serverKey: boolean;
  /** Which credentials this request would use. */
  source: "server" | "byok";
  mode: "live" | "record" | "replay";
  models: { fast: string; smart: string };
}

/** Learner-supplied credentials ride along as one header; see lib/llm/config.ts. */
function llmHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem("genmentor.llm.v1");
    const byok = raw ? (JSON.parse(raw) as { state?: { byok?: unknown } }).state?.byok : null;
    return byok ? { "x-genmentor-llm": JSON.stringify(byok) } : {};
  } catch {
    return {};
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function readError(res: Response): Promise<never> {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // non-JSON error body
  }
  throw new ApiError(message, res.status);
}

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...llmHeaders() }, body: JSON.stringify(body), signal });
  if (!res.ok) return readError(res);
  return (await res.json()) as T;
}

/**
 * Consume a text stream, calling `onDelta` for every chunk of the model's raw output.
 * Resolves with the `@@final` payload when the route sends one, else the full text.
 */
async function postStream<T>(url: string, body: unknown, onDelta?: (text: string) => void, signal?: AbortSignal): Promise<{ raw: string; final: T | null }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...llmHeaders() }, body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) return readError(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    acc += decoder.decode(value, { stream: true });
    const cut = acc.indexOf("\n@@");
    onDelta?.(cut === -1 ? acc : acc.slice(0, cut));
  }
  acc += decoder.decode();
  const err = acc.lastIndexOf("\n@@error\n");
  if (err !== -1) throw new ApiError(acc.slice(err + 9).trim(), 502);
  const fin = acc.lastIndexOf("\n@@final\n");
  if (fin === -1) return { raw: acc, final: null };
  return { raw: acc.slice(0, fin), final: JSON.parse(acc.slice(fin + 9)) as T };
}

type In<S extends z.ZodType> = z.input<S>;

export const api = {
  health: async (): Promise<Health> => {
    const res = await fetch("/api/health", { cache: "no-store", headers: llmHeaders() });
    if (!res.ok) return readError(res);
    return (await res.json()) as Health;
  },
  /** Live round trip with the given credentials; returns the model's reply and latency. */
  testLLM: async (byok: unknown): Promise<{ ok: true; reply: string; ms: number; model: string }> => {
    const res = await fetch("/api/health", { method: "POST", headers: { "Content-Type": "application/json", "x-genmentor-llm": JSON.stringify(byok) } });
    if (!res.ok) return readError(res);
    return (await res.json()) as { ok: true; reply: string; ms: number; model: string };
  },
  refineGoal: (body: In<typeof RefineGoalRequest>) => post<RefinedGoal>("/api/refine-goal", body),
  identifySkillGap: (body: In<typeof IdentifySkillGapRequest>) => post<SkillGaps & SkillRequirements>("/api/identify-skill-gap", body),
  profile: (body: In<typeof ProfileRequest>) => post<{ learner_profile: LearnerProfile }>("/api/profile", body),
  schedulePath: (body: In<typeof SchedulePathRequest>, onDelta?: (t: string) => void) => postStream<LearningPath>("/api/schedule-path", body, onDelta),
  exploreKnowledge: (body: In<typeof ExploreKnowledgeRequest>) => post<KnowledgePoints>("/api/explore-knowledge", body),
  draftKnowledge: (body: In<typeof DraftKnowledgeRequest>, onDelta?: (t: string) => void) => postStream<KnowledgeDraft>("/api/draft-knowledge", body, onDelta),
  integrateDocument: (body: In<typeof IntegrateDocumentRequest>, onDelta?: (t: string) => void) =>
    postStream<{ structure: DocumentStructure; markdown: string }>("/api/integrate-document", body, onDelta),
  generateQuiz: (body: In<typeof GenerateQuizRequest>) => post<{ document_quiz: DocumentQuiz }>("/api/generate-quiz", body),
  simulateFeedback: (body: In<typeof SimulateFeedbackRequest>) => post<LearnerFeedback>("/api/simulate-feedback", body),
  tutor: (body: In<typeof TutorRequest>, onDelta?: (t: string) => void, signal?: AbortSignal) => postStream<never>("/api/tutor", body, onDelta, signal),
  parseResume: async (file: File): Promise<{ text: string; pages: number }> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/parse-resume", { method: "POST", body: form });
    if (!res.ok) return readError(res);
    return (await res.json()) as { text: string; pages: number };
  },
};
