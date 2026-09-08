"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveGoal, useArchive } from "@/lib/store";
import { learnedCount, sessionMinutes, sessionUid } from "@/lib/store/derive";
import { RescheduleDialog } from "./reschedule-dialog";
import { SessionRow } from "./session-row";

export function PathView() {
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) {
    return <EmptyState title="No active goal" body="Pick a goal or start a new one to see its path." action={<Button asChild><Link href="/goals">Go to goals</Link></Button>} />;
  }
  const learned = learnedCount(goal);
  const nextIndex = goal.learning_path.findIndex((s) => !s.if_learned);
  return (
    <>
      <PageHeader
        eyebrow="Learning path"
        title={goal.learning_goal}
        description={`${learned} of ${goal.learning_path.length} sessions learned. Each session has reading written for you and a short quiz; completing one updates your profile and may reshape what comes next.`}
        actions={<RescheduleDialog goal={goal} />}
      />
      <ol className="space-y-3">
        {goal.learning_path.map((s, i) => (
          <SessionRow key={s.id + i} session={s} index={i} isNext={i === nextIndex} minutes={sessionMinutes(goal.sessions[sessionUid(goal.id, i)])} />
        ))}
      </ol>
    </>
  );
}
