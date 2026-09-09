"use client";

import { Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/i18n";
import { useArchive, type Goal } from "@/lib/store";
import { learnedCount, masteryRate } from "@/lib/store/derive";

export function GoalCard({ goal, active }: { goal: Goal; active: boolean }) {
  const { setActiveGoal, removeGoal } = useArchive();
  const { t, fmtDate } = useT();
  const learned = learnedCount(goal);
  const mastery = Math.round(masteryRate(goal.learner_profile) * 100);
  return (
    <Card data-testid="goal-card" data-active={active || undefined} className={active ? "border-brand/60" : undefined}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {active && <Badge>{t("common.active")}</Badge>}
          <span className="text-xs text-muted-foreground">{fmtDate(goal.created_at)}</span>
        </div>
        <CardTitle className="leading-snug">{goal.learning_goal}</CardTitle>
        <CardDescription className="line-clamp-2">{goal.learner_information}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("goals.sessions")}</span>
          <span className="num font-medium">
            {learned} / {goal.learning_path.length}
          </span>
        </div>
        <Progress value={(learned / Math.max(1, goal.learning_path.length)) * 100} aria-label={t("goals.sessionsLearned", { n: learned, total: goal.learning_path.length })} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("goals.skillsMastered")}</span>
          <span className="num font-medium">{mastery}%</span>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        {active ? (
          <Button size="sm" asChild>
            <Link href="/learning-path">{t("goals.openPath")}</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setActiveGoal(goal.id)}>
            <Check aria-hidden /> {t("goals.makeActive")}
          </Button>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={t("goals.deleteGoal")}>
              <Trash2 aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("goals.deleteTitle")}</DialogTitle>
              <DialogDescription>{t("goals.deleteBody")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive" onClick={() => removeGoal(goal.id)}>
                {t("common.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
