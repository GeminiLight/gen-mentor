"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
    return (
      <EmptyState
        title={t("common.noActiveGoal")}
        body={t("path.emptyBody")}
        action={
          <Button asChild>
            <Link href="/goals">{t("common.goToGoals")}</Link>
          </Button>
        }
      />
    );
  }
  const learned = learnedCount(goal);
  const nextIndex = goal.learning_path.findIndex((s) => !s.if_learned);
  const minutes = totalMinutes(goal);
  const stats = [
    { label: t("path.statLearned"), value: `${learned} / ${goal.learning_path.length}` },
    { label: t("path.statMinutes"), value: t("common.minutes", { n: minutes }) },
    { label: t("path.statNext"), value: nextIndex === -1 ? "—" : goal.learning_path[nextIndex].title },
  ];
  return (
    <>
      <PageHeader
        eyebrow={t("path.eyebrow")}
        title={goal.learning_goal}
        description={t("path.lede", { n: learned, total: goal.learning_path.length })}
        actions={<RescheduleDialog goal={goal} />}
      />
      <dl className="mb-6 grid gap-3 sm:grid-cols-3" data-testid="path-stats">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border px-4 py-3">
            <dt className="eyebrow">{s.label}</dt>
            <dd className="num mt-1 truncate text-sm font-medium" title={s.value}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <ol className="space-y-3">
        {goal.learning_path.map((s, i) => (
          <SessionRow
            key={s.id + i}
            session={s}
            index={i}
            isNext={i === nextIndex}
            minutes={sessionMinutes(goal.sessions[sessionUid(goal.id, i)])}
          />
        ))}
      </ol>
    </>
  );
}
