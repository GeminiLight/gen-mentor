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
import { SessionRow } from "./session-row";

export function PathView() {
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  const { t } = useT();
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) {
    return <EmptyState title={t("common.noActiveGoal")} body={t("path.emptyBody")} action={<Button asChild><Link href="/goals">{t("common.goToGoals")}</Link></Button>} />;
  }
  const learned = learnedCount(goal);
  const minutes = totalMinutes(goal);
  const nextIndex = goal.learning_path.findIndex((s) => !s.if_learned);
  const meta = [t("path.lede", { n: learned, total: goal.learning_path.length }), minutes > 0 ? t("common.minutes", { n: minutes }) : null].filter(Boolean).join(" · ");
  return (
    <>
      <PageHeader eyebrow={t("path.eyebrow")} title={goal.learning_goal} description={meta} actions={<RescheduleDialog goal={goal} />} />
      <Progress value={(learned / Math.max(1, goal.learning_path.length)) * 100} className="mb-2 h-1" aria-label={meta} />
      <ol className="divide-y" data-testid="path-stats">
        {goal.learning_path.map((s, i) => (
          <SessionRow key={s.id + i} session={s} index={i} isNext={i === nextIndex} minutes={sessionMinutes(goal.sessions[sessionUid(goal.id, i)])} />
        ))}
      </ol>
    </>
  );
}
