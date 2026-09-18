"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { reviewQueue } from "@/lib/quiz-review";
import { scoredCount } from "@/lib/quiz";
import { learnedCount, totalMinutes } from "@/lib/store/derive";
import { targetProgress, targetSkills } from "@/lib/store/learning-evidence";
import { MasteryLine, MinutesBars } from "./footprint";
import { ProgressRing } from "./mastery-ring";
import { SkillTree } from "./skill-tree";
import { SkillEvidence } from "./skill-evidence";
import { ReviewQueue } from "./review-queue";

export function ProgressView() {
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  const { t } = useT();
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) return <EmptyState title={t("common.noActiveGoal")} body={t("progress.emptyBody")} action={<Button asChild><Link href="/onboarding">{t("common.startWithGoal")}</Link></Button>} />;
  const skills = targetSkills(goal);
  const toReview = reviewQueue(goal).reduce((n, item) => n + item.total, 0);
  const met = skills.filter((s) => s.mastered).length;
  const quizzes = Object.values(goal.sessions).filter((s) => s.quiz_results && scoredCount(s.quiz_results) > 0);
  const accuracy = quizzes.length ? Math.round(quizzes.reduce((a, s) => a + s.quiz_results!.correct, 0) / quizzes.reduce((a, s) => a + scoredCount(s.quiz_results!), 0) * 100) : null;
  return <>
    <PageHeader eyebrow={t("progress.title")} title={t("coach.title")} description={t("coach.lede")} />
    <div className="grid gap-8 border-t border-b py-7 @3xl/workspace:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-5">
        <ProgressRing value={targetProgress(goal)} size={104} />
        <div className="min-w-0"><h2 className="text-sm font-medium">{t("coach.attainment")}</h2><p className="num mt-2 text-lg font-medium" data-testid="stat-mastered">{met} / {skills.length}</p><p className="mt-2 text-xs text-muted-foreground">{t("coach.estimate")}</p></div>
      </div>
      <dl className="grid grid-cols-3 items-center gap-3 @3xl/workspace:border-l @3xl/workspace:pl-8">
        <Stat label={t("coach.questionsReview")} value={String(toReview)} testid="stat-review" />
        <Stat label={t("coach.lessonsDone")} value={`${learnedCount(goal)} / ${goal.learning_path.length}`} sub={t("common.minutes", { n: totalMinutes(goal) })} testid="stat-sessions" />
        <Stat label={t("coach.firstAccuracy")} value={accuracy === null ? "—" : `${accuracy}%`} sub={quizzes.length ? t("progress.acrossQuizzes", { n: quizzes.length }) : undefined} testid="stat-accuracy" />
      </dl>
    </div>
    <details className="mt-3 max-w-(--w-measure) text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3">{t("coach.method")}</summary><p className="pb-4 leading-relaxed">{t("coach.methodBody")}</p></details>
    <div className="mt-8"><ReviewQueue goal={goal} /></div>
    <SkillEvidence goal={goal} />
    <section className="mt-12"><h2 className="mb-5 text-sm font-medium">{t("progress.treeTitle")}</h2><SkillTree goal={goal} /><p className="mt-3 text-xs text-muted-foreground">{t("progress.legend")}</p></section>
    <div className="mt-12 grid gap-10 @3xl/workspace:grid-cols-2">
      <section><h2 className="mb-5 text-sm font-medium">{t("progress.lineTitle")} · {t("coach.estimate")}</h2><MasteryLine goal={goal} /></section>
      <section><h2 className="mb-5 text-sm font-medium">{t("progress.barsTitle")}</h2><MinutesBars goal={goal} /></section>
    </div>
  </>;
}
function Stat({ label, value, sub, testid }: { label: string; value: string; sub?: string; testid?: string }) {
  return <div className="min-w-0"><dt className="text-xs leading-relaxed text-muted-foreground">{label}</dt><dd className="num mt-2 text-lg font-semibold" data-testid={testid}>{value}</dd>{sub && <dd className="mt-1 text-xs text-muted-foreground">{sub}</dd>}</div>;
}
