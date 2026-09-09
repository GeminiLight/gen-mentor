"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import { useArchive } from "@/lib/store";
import { GoalCard } from "./goal-card";

export function GoalsView() {
  const { goals, active_goal_id, hydrated } = useArchive();
  const { t } = useT();
  return (
    <>
      <PageHeader
        title={t("goals.title")}
        actions={
          <Button asChild>
            <Link href="/onboarding">
              <Plus aria-hidden /> {t("goals.newGoal")}
            </Link>
          </Button>
        }
      />
      {!hydrated ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-loading="">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          title={t("goals.emptyTitle")}
          body={t("goals.emptyBody")}
          action={
            <Button asChild>
              <Link href="/onboarding">{t("common.startWithGoal")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} active={g.id === active_goal_id} />
          ))}
        </div>
      )}
    </>
  );
}
