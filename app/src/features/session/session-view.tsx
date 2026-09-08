"use client";

import { ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/client";
import { nextStage, runPipeline, STAGES, type Stage } from "@/lib/pipeline";
import { quizPerformance } from "@/lib/quiz";
import { useActiveGoal, useArchive } from "@/lib/store";
import { masteryRate, sessionUid } from "@/lib/store/derive";
import type { QuizResults, SessionState } from "@/lib/store/types";
import type { StageStatus } from "@/components/stage-list";
import { DocumentView } from "./document-view";
import { PipelinePanel, type PipelineView } from "./pipeline-panel";
import { QuizView } from "./quiz-view";

const idle = (): PipelineView => ({ status: Object.fromEntries(STAGES.map((s) => [s, "pending"])) as Record<Stage, StageStatus>, drafts: {} });

export function SessionView({ index }: { index: number }) {
  const goal = useActiveGoal();
  const { hydrated, patchSession, openSession, submitQuiz, updateGoal, recordMastery } = useArchive();
  const router = useRouter();
  const [view, setView] = useState<PipelineView>(idle);
  const [running, setRunning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const started = useRef<string | null>(null);

  const session = goal?.learning_path[index];
  const uid = goal ? sessionUid(goal.id, index) : null;
  const state: SessionState | undefined = goal && uid ? goal.sessions[uid] : undefined;

  const start = useCallback(
    async (fresh = false) => {
      if (!goal || !session || !uid) return;
      const base = fresh ? { opened_at: state?.opened_at ?? [] } : (state ?? { opened_at: [] });
      if (fresh) patchSession(uid, { knowledge_points: undefined, knowledge_drafts: undefined, document: undefined, quiz: undefined, quiz_results: undefined });
      setRunning(true);
      const v = idle();
      if (base.knowledge_points) v.status.knowledge_points = "done";
      if (base.knowledge_drafts) v.status.knowledge_drafts = "done";
      if (base.document) v.status.document = "done";
      if (base.quiz) v.status.quiz = "done";
      v.points = base.knowledge_points;
      setView({ ...v });
      try {
        await runPipeline(
          { learner_profile: goal.learner_profile, learning_path: goal.learning_path, learning_session: session, state: base, use_search: true },
          {
            onStage: (stage, status) => setView((cur) => ({ ...cur, status: { ...cur.status, [stage]: status } })),
            onDraftDelta: (i, partial) => setView((cur) => ({ ...cur, drafts: { ...cur.drafts, [i]: partial } })),
            onDocumentDelta: (partial) => setView((cur) => ({ ...cur, document: partial })),
            onCheckpoint: (patch) => {
              patchSession(uid, patch);
              if (patch.knowledge_points) setView((cur) => ({ ...cur, points: patch.knowledge_points }));
            },
          },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Content generation failed";
        setView((cur) => ({ ...cur, error: msg, status: Object.fromEntries(Object.entries(cur.status).map(([k, s]) => [k, s === "running" ? "error" : s])) as PipelineView["status"] }));
      } finally {
        setRunning(false);
      }
    },
    [goal, session, uid, state, patchSession],
  );

  // First visit: record the open and kick off whatever stage is missing.
  useEffect(() => {
    if (!hydrated || !goal || !uid || started.current === uid) return;
    started.current = uid;
    // Deferred so the effect itself does not set state; the pipeline is a side effect of the visit.
    const pending = nextStage(goal.sessions[uid] ?? { opened_at: [] });
    void Promise.resolve().then(() => {
      openSession(uid);
      if (pending) void start();
    });
  }, [hydrated, goal, uid, openSession, start]);

  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal || !session || !uid) {
    return <EmptyState title="Session not found" body="This session is not on the active goal's path." action={<Button asChild><Link href="/learning-path">Back to the path</Link></Button>} />;
  }

  const complete = async () => {
    setCompleting(true);
    try {
      const results = state?.quiz_results;
      const interactions = results && results.answered > 0 ? { quiz_performance: quizPerformance(results, session.title) } : {};
      const { learner_profile } = await api.profile({ mode: "update", learner_profile: goal.learner_profile, learner_interactions: interactions, session_information: { ...session, if_learned: true } });
      updateGoal(goal.id, (g) => ({ learner_profile, learning_path: g.learning_path.map((s, i) => (i === index ? { ...s, if_learned: true } : s)) }));
      patchSession(uid, { completed_at: Date.now() });
      recordMastery(goal.id, masteryRate(learner_profile), learner_profile.cognitive_status.overall_progress);
      toast.success("Session completed", { description: `Profile updated. Overall progress ${learner_profile.cognitive_status.overall_progress}%.` });
      router.push("/learning-path");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update your profile");
    } finally {
      setCompleting(false);
    }
  };

  const doc = state?.document;
  const quiz = state?.quiz;
  const sources = state?.knowledge_drafts?.flatMap((d) => d.sources) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link href="/learning-path">
            <ArrowLeft aria-hidden /> Path
          </Link>
        </Button>
        <p className="eyebrow mt-4">{session.id}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{session.title}</h1>
        <p className="mt-2 max-w-(--w-measure) text-sm leading-relaxed text-muted-foreground">{session.abstract}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {session.associated_skills.map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
          {session.if_learned && <Badge className="bg-success-soft text-success">Learned</Badge>}
        </div>
      </div>

      {!doc || !quiz || running ? (
        <PipelinePanel view={view} />
      ) : (
        <Tabs defaultValue="read">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="read">Read</TabsTrigger>
              <TabsTrigger value="quiz" data-testid="tab-quiz">
                Quiz{state?.quiz_results ? ` · ${state.quiz_results.correct}/${state.quiz_results.answered}` : ""}
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => void start(true)} disabled={completing}>
                <RefreshCw aria-hidden /> Regenerate
              </Button>
              {!session.if_learned && (
                <Button size="sm" onClick={() => void complete()} disabled={completing} data-testid="complete-session">
                  <CheckCircle2 aria-hidden /> {completing ? "Updating profile…" : "Complete session"}
                </Button>
              )}
            </div>
          </div>
          <TabsContent value="read" className="pt-6">
            <DocumentView markdown={doc.markdown} sources={sources} />
          </TabsContent>
          <TabsContent value="quiz" className="pt-6">
            <QuizView key={state?.quiz_results?.submittedAt ?? "fresh"} quiz={quiz} results={state?.quiz_results} onSubmit={(r: QuizResults) => submitQuiz(uid, r)} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
