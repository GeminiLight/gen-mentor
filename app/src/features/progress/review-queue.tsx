"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { Goal } from "@/lib/store";
import { reviewQueue } from "@/lib/quiz-review";

export function ReviewQueue({ goal, compact = false }: { goal: Goal; compact?: boolean }) {
  const { t } = useT();
  const queue = reviewQueue(goal);
  const hasQuiz = Object.values(goal.sessions).some((s) => s.quiz_results);
  return <section aria-label={t("coach.reviewTitle")} className="min-w-0" data-testid="review-queue">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div><p className="eyebrow mb-2">{t("coach.nextFocus")}</p><h2 className="text-lg font-semibold">{t("coach.reviewTitle")}</h2><p className="mt-2 max-w-(--w-measure) text-sm leading-relaxed text-muted-foreground">{t("coach.reviewBody")}</p></div>
      <RotateCcw className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
    </div>
    {queue.length ? <>
      <ol className="divide-y border-t border-b">
        {(compact ? queue.slice(0, 2) : queue).map(({ index, session, incorrect, skipped, total }) => <li key={index} className="group relative flex flex-wrap items-center gap-4 py-5">
          <span className="num flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-sm font-medium text-warning" aria-hidden>{total}</span>
          <div className="min-w-0 flex-1 basis-48">
            <h3 className="text-sm font-medium leading-relaxed wrap-anywhere"><Link href={`/session/${index}#practice`} className="after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50">{session.title}</Link></h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("coach.reviewReason", { wrong: incorrect, skipped })}</p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
        </li>)}
      </ol>
      {compact ? <Button variant="link" asChild className="mt-3 -ml-2"><Link href="/progress">{t("coach.reviewLink")}<ArrowRight aria-hidden /></Link></Button> : <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("coach.reviewOrdering")}</p>}
    </> : <div className="border-t pt-5">
      <p className="text-sm font-medium">{t(hasQuiz ? "coach.clearTitle" : "coach.noEvidence")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(hasQuiz ? "coach.clearBody" : "coach.noEvidenceBody")}</p>
      <Button className="mt-4" variant="outline" asChild><Link href="/learning-path">{t("polish.openPath")}<ArrowRight aria-hidden /></Link></Button>
    </div>}
  </section>;
}
