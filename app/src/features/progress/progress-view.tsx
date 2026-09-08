"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useActiveGoal, useArchive } from "@/lib/store";
import { learnedCount, masteryRate, skillLevels, totalMinutes } from "@/lib/store/derive";
import { cn } from "@/lib/utils";

const LEVEL_CLASS = ["bg-level-0", "bg-level-1", "bg-level-2", "bg-level-3"];

/** M3 baseline: honest numbers from the archive. M4 turns these into the skill tree, rings and footprint. */
export function ProgressView() {
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) return <EmptyState title="No active goal" body="Progress is tracked per goal." action={<Button asChild><Link href="/goals">Go to goals</Link></Button>} />;

  const profile = goal.learner_profile;
  const skills = skillLevels(profile);
  const learned = learnedCount(goal);
  const minutes = totalMinutes(goal);

  return (
    <>
      <PageHeader eyebrow="Progress" title="What has actually changed" description="Every number here comes from your learning records: sessions completed, quiz answers, and the profile the agents rebuilt from them." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Overall progress" value={`${profile.cognitive_status.overall_progress}%`} sub="from your learner profile" testid="stat-progress" />
        <Stat label="Skills mastered" value={`${profile.cognitive_status.mastered_skills.length} / ${skills.length}`} sub={`${Math.round(masteryRate(profile) * 100)}% of required skills`} />
        <Stat label="Sessions" value={`${learned} / ${goal.learning_path.length}`} sub={minutes > 0 ? `${minutes} min of reading` : "no time recorded yet"} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>Current level against what the goal requires.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Skill</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Required</TableHead>
                <TableHead className="hidden w-40 sm:table-cell">Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className={cn(s.mastered && "text-success")}>{s.current}</TableCell>
                  <TableCell className="text-muted-foreground">{s.required}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex gap-1" role="img" aria-label={`${s.current}, ${s.required} required`}>
                      {[1, 2, 3].map((lvl) => (
                        <span key={lvl} className={cn("h-2 flex-1 rounded-full", lvl <= s.currentRank ? LEVEL_CLASS[s.currentRank] : lvl <= s.requiredRank ? "bg-muted" : "bg-transparent")} />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Mastery over time</CardTitle>
          <CardDescription>One point each time your profile was rebuilt after a session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {goal.mastery_history.map((p, i) => (
            <div key={p.ts} className="flex items-center gap-4 text-sm">
              <span className="num w-36 shrink-0 text-muted-foreground">{new Date(p.ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
              <Progress value={p.rate * 100} className="flex-1" aria-label={`Mastery ${Math.round(p.rate * 100)}%`} />
              <span className="num w-12 text-right font-medium">{Math.round(p.rate * 100)}%</span>
              {i === 0 && <span className="text-xs text-muted-foreground">start</span>}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ label, value, sub, testid }: { label: string; value: string; sub: string; testid?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="eyebrow">{label}</p>
        <p className="num mt-2 text-xl font-semibold" data-testid={testid}>
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
