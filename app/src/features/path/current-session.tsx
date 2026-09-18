"use client";

import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LessonOutcomes } from "@/features/session/lesson-outcomes";
import { useT } from "@/lib/i18n";
import type { Goal } from "@/lib/store";
import { sessionUid } from "@/lib/store/derive";
import { readingMinutes } from "@/lib/utils";
import { lessonState } from "./lesson-state";

export function CurrentSession({ goal, index }: { goal: Goal; index: number }) {
  const { t } = useT();
  const session = goal.learning_path[index];
  if (!session) return null;
  const state = goal.sessions[sessionUid(goal.id, index)];
  const status = lessonState(session.if_learned, state);
  return (
    <section className="my-8 overflow-hidden rounded-xl border bg-card" aria-label={t("polish.currentSession")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-5 py-3 sm:px-7">
        <p className="flex items-center gap-2 text-sm font-medium"><BookOpen className="size-4 text-brand" aria-hidden />{t("polish.lessonNumber", { n: index + 1, total: goal.learning_path.length })}</p>
        <span className="text-xs text-muted-foreground">{t(status.label)}</span>
      </div>
      <div className="grid gap-6 p-5 @3xl/workspace:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:p-7">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug text-balance sm:text-xl wrap-anywhere">{session.title}</h2>
          <p className="mt-3 max-w-(--w-measure) text-sm leading-relaxed text-muted-foreground">{session.abstract}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild className="h-11 w-full px-5 @lg/workspace:w-auto"><Link href={`/session/${index}${status.quiz ? "#quiz" : ""}`}>{t(status.action)}<ArrowRight aria-hidden /></Link></Button>
            {state?.document && !status.quiz && <span className="text-xs text-muted-foreground">{t("session.readingTime", { n: readingMinutes(state.document.markdown) })}</span>}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t(state?.document ? "journey.resumeHint" : "journey.prepareHint")}</p>
        </div>
        {!!session.desired_outcome_when_completed.length && <div className="border-t pt-5 @3xl/workspace:border-t-0 @3xl/workspace:border-l @3xl/workspace:pt-0 @3xl/workspace:pl-6"><LessonOutcomes session={session} /></div>}
      </div>
    </section>
  );
}
