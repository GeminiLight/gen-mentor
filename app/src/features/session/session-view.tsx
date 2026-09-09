"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { nextStage, runPipeline, STAGES, type Stage } from "@/lib/pipeline";
import { useActiveGoal, useArchive } from "@/lib/store";
import { sessionUid } from "@/lib/store/derive";
import type { SessionState } from "@/lib/store/types";
import type { StageStatus } from "@/components/stage-list";
import { readingMinutes } from "@/lib/utils";
import { PipelinePanel, type PipelineView } from "./pipeline-panel";
import { SessionHeader } from "./session-header";
import { SessionReader } from "./session-reader";
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
  const minutes = state?.document?.markdown ? readingMinutes(state.document.markdown) : undefined;

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

  // The tab and history entry carry the session's own title, not a generic "Session".
  useEffect(() => {
    if (session) document.title = `${session.title} · ${t("common.appName")}`;
  }, [session, t]);

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

  return (
    <div className="space-y-8">
      <SessionHeader session={session} readingMinutes={minutes} />

      <AnimatePresence mode="wait" initial={false}>
        {!doc || !quiz || running ? (
          <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {/* A retry resumes from the last checkpoint; only the stages that never finished run again. */}
            <PipelinePanel view={view} onRetry={running ? undefined : () => void start()} />
          </motion.div>
        ) : (
          <motion.div key="reader" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}>
            <SessionReader
              session={session}
              next={goal.learning_path[index + 1] ? { index: index + 1, title: goal.learning_path[index + 1].title } : undefined}
              markdown={doc.markdown}
              sources={state?.knowledge_drafts?.flatMap((d) => d.sources) ?? []}
              quiz={quiz}
              results={state?.quiz_results}
              tab={tab}
              onTab={setTab}
              completing={completing}
              onComplete={() => void complete()}
              onRegenerate={() => void start(true)}
              onSubmitQuiz={(r) => submitQuiz(uid, r)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
