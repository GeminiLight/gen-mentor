"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/i18n";
import { useArchive, type Goal } from "@/lib/store";
import { learnedCount } from "@/lib/store/derive";
import { cn } from "@/lib/utils";

export function GoalCard({ goal, active }: { goal: Goal; active: boolean }) {
  const { setActiveGoal, removeGoal } = useArchive();
  const { t, fmtDate } = useT();
  const learned = learnedCount(goal);
  const { mastered_skills, in_progress_skills } = goal.learner_profile.cognitive_status;
  const skills = mastered_skills.length + in_progress_skills.length;
  return (
    <div data-testid="goal-card" data-active={active || undefined} className={cn("flex flex-col rounded-xl border bg-card p-5", active && "border-brand/60")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {active && <span className="mr-2 font-medium text-brand">{t("common.active")}</span>}
          {fmtDate(goal.created_at)}
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="icon-xs" variant="ghost" aria-label={t("goals.deleteGoal")} className="-mt-1 -mr-1 text-muted-foreground">
              <Trash2 aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("goals.deleteTitle")}</DialogTitle>
              <DialogDescription>{t("goals.deleteBody")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">{t("common.cancel")}</Button>
              </DialogClose>
              <Button variant="destructive" onClick={() => removeGoal(goal.id)}>
                {t("common.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <h2 className="mt-2 font-medium leading-snug text-balance">{goal.learning_goal}</h2>
      <div className="mt-5 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("goals.sessionsLearned", { n: learned, total: goal.learning_path.length })}</span>
          <span className="num">
            {t("goals.skillsMastered")} {mastered_skills.length} / {skills}
          </span>
        </div>
        <Progress value={(learned / Math.max(1, goal.learning_path.length)) * 100} aria-label={t("goals.sessionsLearned", { n: learned, total: goal.learning_path.length })} />
      </div>
      <div className="mt-5">
        {active ? (
          <Button size="sm" asChild>
            <Link href="/learning-path">{t("goals.openPath")}</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setActiveGoal(goal.id)}>
            {t("goals.makeActive")}
          </Button>
        )}
      </div>
    </div>
  );
}
