"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { nextStage, runPipeline, STAGES, type Stage } from "@/lib/pipeline";
import { useActiveGoal, useArchive } from "@/lib/store";
import { sessionUid } from "@/lib/store/derive";
import type { QuizResults, SessionState } from "@/lib/store/types";
import type { StageStatus } from "@/components/stage-list";
import { DocumentView } from "./document-view";
import { PipelinePanel, type PipelineView } from "./pipeline-panel";
import { QuizView } from "./quiz-view";
import { ReadingProgress } from "./reading-progress";
import { RegenerateButton } from "./regenerate-button";
import { SessionHeader } from "./session-header";
import { useCompleteSession } from "./use-complete-session";
import { useT } from "@/lib/i18n";

const idle = (): PipelineView => ({
  status: Object.fromEntries(STAGES.map((s) => [s, "pending"])) as Record<Stage, StageStatus>,
  drafts: {},
});

export function SessionView({ index }: { index: number }) {
  const goal = useActiveGoal();
  const { hydrated, patchSession, openSession, submitQuiz } = useArchive();
  const { t } = useT();
  const [view, setView] = useState<PipelineView>(idle);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState("read");
  const started = useRef<string | null>(null);

  const session = goal?.learning_path[index];
  const { complete, completing } = useCompleteSession(goal, session, index);
  const uid = goal ? sessionUid(goal.id, index) : null;
  const state: SessionState | undefined = goal && uid ? goal.sessions[uid] : undefined;
  const readingMinutes = useMemo(() => {
    const md = state?.document?.markdown;
    return md ? Math.max(1, Math.round(md.split(/\s+/).length / 200)) : undefined;
  }, [state?.document?.markdown]);

  const start = useCallback(
    async (fresh = false) => {
      if (!goal || !session || !uid) return;
      const base = fresh ? { opened_at: state?.opened_at ?? [] } : (state ?? { opened_at: [] });
      if (fresh)
        patchSession(uid, {
          knowledge_points: undefined,
          knowledge_drafts: undefined,
          document: undefined,
          quiz: undefined,
          quiz_results: undefined,
        });
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
          {
            learner_profile: goal.learner_profile,
            learning_path: goal.learning_path,
            learning_session: session,
            state: base,
            use_search: true,
          },
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
        const msg = e instanceof Error ? e.message : t("session.generationFailed");
        setView((cur) => ({
          ...cur,
          error: msg,
          status: Object.fromEntries(
            Object.entries(cur.status).map(([k, s]) => [k, s === "running" ? "error" : s]),
          ) as PipelineView["status"],
        }));
      } finally {
        setRunning(false);
      }
    },
    [goal, session, uid, state, patchSession, t],
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
    return (
      <EmptyState
        title={t("session.notFoundTitle")}
        body={t("session.notFoundBody")}
        action={
          <Button asChild>
            <Link href="/learning-path">{t("session.backToPath")}</Link>
          </Button>
        }
      />
    );
  }

  const doc = state?.document;
  const quiz = state?.quiz;
  const sources = state?.knowledge_drafts?.flatMap((d) => d.sources) ?? [];

  return (
    <div className="space-y-8">
      <SessionHeader session={session} readingMinutes={readingMinutes} />

      <AnimatePresence mode="wait" initial={false}>
        {!doc || !quiz || running ? (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <PipelinePanel view={view} />
          </motion.div>
        ) : (
          <motion.div
            key="reader"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
          >
            <Tabs value={tab} onValueChange={setTab}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="read">{t("session.read")}</TabsTrigger>
                  <TabsTrigger value="quiz" data-testid="tab-quiz">
                    {t("session.quiz")}
                    {state?.quiz_results ? ` · ${state.quiz_results.correct}/${state.quiz_results.answered}` : ""}
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <RegenerateButton disabled={completing} onConfirm={() => void start(true)} />
                  {!session.if_learned && (
                    <Button
                      size="sm"
                      onClick={() => void complete()}
                      disabled={completing}
                      data-testid="complete-session"
                    >
                      <CheckCircle2 aria-hidden /> {completing ? t("session.completing") : t("session.complete")}
                    </Button>
                  )}
                </div>
              </div>
              <TabsContent value="read" className="pt-6">
                <ReadingProgress />
                <DocumentView markdown={doc.markdown} sources={sources} />
                <div
                  className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t pt-6 lg:max-w-(--w-measure)"
                  data-testid="reading-end"
                >
                  <p className="text-sm text-muted-foreground">{t("session.finishedReading")}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setTab("quiz")}>
                      {t("session.quiz")}
                    </Button>
                    {!session.if_learned && (
                      <Button size="sm" onClick={() => void complete()} disabled={completing}>
                        <CheckCircle2 aria-hidden /> {completing ? t("session.completing") : t("session.complete")}
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="quiz" className="pt-6">
                <QuizView
                  key={state?.quiz_results?.submittedAt ?? "fresh"}
                  quiz={quiz}
                  results={state?.quiz_results}
                  onSubmit={(r: QuizResults) => submitQuiz(uid, r)}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
