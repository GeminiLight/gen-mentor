"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArchive } from "@/lib/store";
import { GoalCard } from "./goal-card";

export function GoalsView() {
  const { goals, active_goal_id, hydrated } = useArchive();
  return (
    <>
      <PageHeader
        eyebrow="Goals"
        title="What you are working toward"
        description="One goal is active at a time; its path, library and progress fill the rest of the app."
        actions={
          <Button asChild>
            <Link href="/onboarding">
              <Plus aria-hidden /> New goal
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
          title="No goals yet"
          body="Start with where you want to be. GenMentor turns it into a skill gap and a path of sessions."
          action={
            <Button asChild>
              <Link href="/onboarding">Start with a goal</Link>
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
