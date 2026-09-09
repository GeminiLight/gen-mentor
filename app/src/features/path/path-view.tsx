"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { learnedCount, sessionMinutes, sessionUid, totalMinutes } from "@/lib/store/derive";
import { RescheduleDialog } from "./reschedule-dialog";
import { CurrentSession } from "./current-session";
import { SessionRow } from "./session-row";

export function PathView() {
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  const { t } = useT();
  if (!hydrated) return <PathSkeleton />;
  if (!goal) {
    return <EmptyState title={t("common.noActiveGoal")} body={t("path.emptyBody")} action={<Button asChild><Link href="/goals">{t("common.goToGoals")}</Link></Button>} />;
  }
  const total = goal.learning_path.length;
  const learned = learnedCount(goal);
  const minutes = totalMinutes(goal);
  const nextIndex = goal.learning_path.findIndex((s) => !s.if_learned);
  const meta = [t("path.lede", { n: learned, total }), minutes > 0 ? t("common.minutes", { n: minutes }) : null].filter(Boolean).join(" · ");
  return (
    <>
      <PageHeader eyebrow={t("polish.currentGoal")} title={t("path.eyebrow")} description={goal.original_goal} actions={<RescheduleDialog goal={goal} />} />
      <p className="num mb-3 text-xs text-muted-foreground">{meta}</p>
      <Progress value={(learned / Math.max(1, total)) * 100} className="mb-2 h-1" aria-label={meta} />
      {total > 0 && learned === total && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/40 bg-brand-soft/40 px-4 py-3 text-sm" data-testid="path-all-done">
          <div>
            <p className="font-medium">{t("path.allDoneTitle")}</p>
            <p className="text-muted-foreground">{t("path.allDoneBody")}</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/onboarding">{t("goals.newGoal")}</Link>
          </Button>
        </div>
      )}
      <CurrentSession goal={goal} index={nextIndex} />
      <h2 className="mt-10 mb-1 text-sm font-medium">{t("polish.coursePlan")}</h2>
      <p className="mb-5 text-xs text-muted-foreground">{t("polish.coursePlanBody")}</p>
      <ol className="divide-y" data-testid="path-stats">
        {goal.learning_path.map((s, i) => (
          <SessionRow key={s.id + i} session={s} index={i} isNext={i === nextIndex} minutes={sessionMinutes(goal.sessions[sessionUid(goal.id, i)])} />
        ))}
      </ol>
    </>
  );
}

/** The shape of the page before the archive hydrates: header, bar, three rows. */
function PathSkeleton() {
  return (
    <div data-loading="">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-3/4 max-w-2xl" />
      <Skeleton className="mt-3 h-4 w-40" />
      <Skeleton className="mt-8 h-1 w-full" />
      <div className="divide-y">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-6 py-5">
            <Skeleton className="size-7 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
