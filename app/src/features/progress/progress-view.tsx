"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveGoal, useArchive } from "@/lib/store";
import { learnedCount, masteryRate, skillLevels, totalMinutes } from "@/lib/store/derive";
import { MasteryLine, MinutesBars } from "./footprint";
import { MasteryRing, ProgressRing } from "./mastery-ring";
import { SkillTree } from "./skill-tree";

const LEVELS = ["unlearned", "beginner", "intermediate", "advanced"];

/** Every visual here is a view over the archive. If a number cannot be traced to a record, it is not shown. */
export function ProgressView() {
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) return <EmptyState title="No active goal" body="Progress is tracked per goal. Start one and the tree grows from your skill gap." action={<Button asChild><Link href="/onboarding">Start with a goal</Link></Button>} />;

  const profile = goal.learner_profile;
  const skills = skillLevels(profile);
  const learned = learnedCount(goal);
  const minutes = totalMinutes(goal);
  const quizzes = Object.values(goal.sessions).filter((s) => s.quiz_results?.answered);
  const accuracy = quizzes.length ? Math.round((quizzes.reduce((a, s) => a + s.quiz_results!.correct, 0) / quizzes.reduce((a, s) => a + s.quiz_results!.answered, 0)) * 100) : null;

  return (
    <>
      <PageHeader eyebrow="Progress" title="What has actually changed" description="Sessions completed, quiz answers, and the profile the agents rebuilt from them. Nothing here is decorative." />

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <Card className="flex flex-row items-center gap-6 px-6">
          <ProgressRing value={profile.cognitive_status.overall_progress} />
          <div>
            <p className="eyebrow">Overall progress</p>
            <p className="mt-1 text-sm text-muted-foreground">Set by the profiler from what you have learned so far.</p>
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Skills mastered" value={`${profile.cognitive_status.mastered_skills.length} / ${skills.length}`} sub={`${Math.round(masteryRate(profile) * 100)}% of required`} testid="stat-mastered" />
          <Stat label="Sessions" value={`${learned} / ${goal.learning_path.length}`} sub={minutes > 0 ? `${minutes} min of reading` : "no time recorded yet"} testid="stat-sessions" />
          <Stat label="Quiz accuracy" value={accuracy === null ? "—" : `${accuracy}%`} sub={quizzes.length ? `across ${quizzes.length} quiz${quizzes.length === 1 ? "" : "zes"}` : "no quiz taken yet"} testid="stat-accuracy" />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Skill tree</CardTitle>
          <CardDescription>Your goal, the skills it demands, and the sessions that move each one. Rings fill as the profiler raises your level; sessions light up when learned.</CardDescription>
        </CardHeader>
        <CardContent>
          <SkillTree goal={goal} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Mastery rings</CardTitle>
          <CardDescription>Three segments per skill: filled is where you are, outlined is what the goal still needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="mastery-rings">
            {skills.map((s) => (
              <li key={s.name} className="flex items-center gap-4 rounded-lg border p-3">
                <MasteryRing current={s.currentRank} required={s.requiredRank} label={`${s.name}: ${LEVELS[s.currentRank]}, ${LEVELS[s.requiredRank]} required`} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {LEVELS[s.currentRank]} → {LEVELS[s.requiredRank]}
                    {s.mastered && <span className="ml-2 text-success">mastered</span>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mastery over time</CardTitle>
            <CardDescription>Share of required skills mastered, at each profile rebuild.</CardDescription>
          </CardHeader>
          <CardContent>
            <MasteryLine goal={goal} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Learning footprint</CardTitle>
            <CardDescription>Minutes per session, from first open to completion.</CardDescription>
          </CardHeader>
          <CardContent>
            <MinutesBars goal={goal} />
          </CardContent>
        </Card>
      </div>
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
