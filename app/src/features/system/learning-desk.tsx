"use client";

import { ArrowRight, BookOpen, Check, Route } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/i18n";
import type { Goal } from "@/lib/store";
import { learnedCount, sessionUid } from "@/lib/store/derive";

export function LearningDesk({ goal }: { goal: Goal }) {
  const { t } = useT();
  const index = goal.learning_path.findIndex((s) => !s.if_learned);
  const next = goal.learning_path[index];
  const state = goal.sessions[sessionUid(goal.id, index)];
  const learned = learnedCount(goal);
  return (
    <section className="mx-auto w-full max-w-(--w-content) flex-1 px-6 py-12 sm:py-20" data-hydrated="" data-testid="home-resume">
      <p className="eyebrow">{t("polish.workspace")}</p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{t("polish.welcome")}</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
        <div className="min-w-0 rounded-xl border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {next ? <BookOpen className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
            {next ? t("polish.lessonNumber", { n: index + 1, total: goal.learning_path.length }) : t("polish.completedPlan")}
          </div>
          <h2 className="mt-5 text-xl font-semibold leading-snug text-balance">{next?.title ?? t("home.allDone")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{next?.abstract ?? t("polish.completedPlanBody")}</p>
          {state?.reading_anchor && <p className="mt-5 text-xs text-muted-foreground">{t("polish.savedPlace")}</p>}
          <Button size="lg" asChild className="mt-8 h-11 px-5">
            <Link href={next ? `/session/${index}` : "/progress"} data-testid="continue-link">
              {next ? t("home.continue") : t("progress.title")} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <aside className="space-y-6 lg:pt-2">
          <div>
            <p className="eyebrow">{t("polish.currentGoal")}</p>
            <p className="mt-3 text-sm leading-relaxed">{goal.learning_goal}</p>
          </div>
          <div className="space-y-3">
            <p className="num text-xs text-muted-foreground">{t("path.lede", { n: learned, total: goal.learning_path.length })}</p>
            <Progress value={learned / Math.max(1, goal.learning_path.length) * 100} className="h-1" aria-label={t("path.lede", { n: learned, total: goal.learning_path.length })} />
          </div>
          <div className="flex flex-col items-start gap-2 border-t pt-4">
            <Button variant="ghost" asChild className="-ml-2"><Link href="/learning-path"><Route aria-hidden />{t("polish.openPath")}</Link></Button>
            <Button variant="ghost" asChild className="-ml-2"><Link href="/library"><BookOpen aria-hidden />{t("library.title")}</Link></Button>
            <Button variant="link" asChild className="-ml-2 text-muted-foreground"><Link href="/onboarding">{t("home.newGoal")}</Link></Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
