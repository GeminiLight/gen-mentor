"use client";

import { ArrowRight, Compass, Trash2 } from "lucide-react";
import Link from "next/link";
import { FeatureIcon } from "@/components/feature-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/i18n";
import { useArchive, type Goal } from "@/lib/store";
import { learnedCount } from "@/lib/store/derive";
import { targetSkills } from "@/lib/store/learning-evidence";
import { cn } from "@/lib/utils";

export function GoalCard({ goal, active }: { goal: Goal; active: boolean }) {
  const { setActiveGoal, removeGoal } = useArchive();
  const { t, fmtDate } = useT();
  const learned = learnedCount(goal);
  const targets = targetSkills(goal);
  const mastered = targets.filter((s) => s.mastered).length;
  const skills = targets.length;
  return (
    <div data-testid="goal-card" data-active={active || undefined} className={cn("flex min-w-0 flex-col rounded-xl border bg-card p-6 transition-shadow hover:shadow-sm", active && "border-brand/30")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><FeatureIcon icon={Compass} />
        <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
          {active && <span className="mb-1 block font-medium text-brand">{t("common.active")}</span>}
          {fmtDate(goal.created_at)}
        </p></div>
        <Dialog>
          <Tooltip><TooltipTrigger asChild><DialogTrigger asChild>
            <Button size="icon-xs" variant="ghost" aria-label={t("goals.deleteGoal")} className="-mt-1 -mr-1 text-muted-foreground">
              <Trash2 aria-hidden />
            </Button>
          </DialogTrigger></TooltipTrigger><TooltipContent>{t("goals.deleteGoal")}</TooltipContent></Tooltip>
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
      <h2 className="mt-5 text-lg font-medium leading-snug wrap-anywhere">{goal.learning_goal}</h2>
      <div className="mt-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{t("goals.sessionsLearned", { n: learned, total: goal.learning_path.length })}</span>
          <span className="num">
            {t("coach.attainment")} {mastered} / {skills}
          </span>
        </div>
        <Progress value={(learned / Math.max(1, goal.learning_path.length)) * 100} aria-label={t("goals.sessionsLearned", { n: learned, total: goal.learning_path.length })} />
      </div>
      <div className="mt-auto pt-6">
        {active ? (
          <Button className="min-h-11 w-full justify-between" asChild>
            <Link href="/learning-path">{t("goals.openPath")}<ArrowRight data-icon="inline-end" aria-hidden /></Link>
          </Button>
        ) : (
          <Button className="min-h-11 w-full" variant="outline" onClick={() => setActiveGoal(goal.id)}>
            {t("goals.makeActive")}
          </Button>
        )}
      </div>
    </div>
  );
}
