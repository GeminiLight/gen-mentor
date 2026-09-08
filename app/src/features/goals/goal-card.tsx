"use client";

import { Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useArchive, type Goal } from "@/lib/store";
import { learnedCount, masteryRate } from "@/lib/store/derive";

export function GoalCard({ goal, active }: { goal: Goal; active: boolean }) {
  const { setActiveGoal, removeGoal } = useArchive();
  const learned = learnedCount(goal);
  const mastery = Math.round(masteryRate(goal.learner_profile) * 100);
  return (
    <Card data-testid="goal-card" data-active={active || undefined} className={active ? "border-brand/60" : undefined}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {active && <Badge>Active</Badge>}
          <span className="text-xs text-muted-foreground">{new Date(goal.created_at).toLocaleDateString()}</span>
        </div>
        <CardTitle className="leading-snug">{goal.learning_goal}</CardTitle>
        <CardDescription className="line-clamp-2">{goal.learner_information}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Sessions</span>
          <span className="num font-medium">
            {learned} / {goal.learning_path.length}
          </span>
        </div>
        <Progress value={(learned / Math.max(1, goal.learning_path.length)) * 100} aria-label={`${learned} of ${goal.learning_path.length} sessions learned`} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Skills mastered</span>
          <span className="num font-medium">{mastery}%</span>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        {active ? (
          <Button size="sm" asChild>
            <Link href="/learning-path">Open path</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setActiveGoal(goal.id)}>
            <Check aria-hidden /> Make active
          </Button>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label="Delete goal">
              <Trash2 aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this goal?</DialogTitle>
              <DialogDescription>Its path, documents, quiz results and tutor history go with it. Export your archive first if you want a copy.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive" onClick={() => removeGoal(goal.id)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
