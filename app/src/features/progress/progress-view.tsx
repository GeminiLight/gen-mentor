"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { learnedCount, masteryRate, skillLevels, totalMinutes } from "@/lib/store/derive";
import { MasteryLine, MinutesBars } from "./footprint";
import { MasteryRing, ProgressRing } from "./mastery-ring";
import { SkillTree } from "./skill-tree";

const LEVELS = ["unlearned", "beginner", "intermediate", "advanced"] as const;

/** Every visual here is a view over the archive. If a number cannot be traced to a record, it is not shown. */
export function ProgressView() {
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  const { t } = useT();
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) return <EmptyState title={t("common.noActiveGoal")} body={t("progress.emptyBody")} action={<Button asChild><Link href="/onboarding">{t("common.startWithGoal")}</Link></Button>} />;

  const profile = goal.learner_profile;
  const skills = skillLevels(profile);
  const learned = learnedCount(goal);
  const minutes = totalMinutes(goal);
  const quizzes = Object.values(goal.sessions).filter((s) => s.quiz_results?.answered);
  const accuracy = quizzes.length ? Math.round((quizzes.reduce((a, s) => a + s.quiz_results!.correct, 0) / quizzes.reduce((a, s) => a + s.quiz_results!.answered, 0)) * 100) : null;

  return (
    <>
      <PageHeader eyebrow={t("progress.eyebrow")} title={t("progress.title")} description={t("progress.lede")} />

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <Card className="flex flex-row items-center gap-6 px-6">
          <ProgressRing value={profile.cognitive_status.overall_progress} />
          <div>
            <p className="eyebrow">{t("progress.overall")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("progress.overallSub")}</p>
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label={t("progress.skillsMastered")} value={`${profile.cognitive_status.mastered_skills.length} / ${skills.length}`} sub={t("progress.ofRequired", { n: Math.round(masteryRate(profile) * 100) })} testid="stat-mastered" />
          <Stat label={t("progress.sessions")} value={`${learned} / ${goal.learning_path.length}`} sub={minutes > 0 ? t("progress.minutesReading", { n: minutes }) : t("progress.noTime")} testid="stat-sessions" />
          <Stat label={t("progress.accuracy")} value={accuracy === null ? "—" : `${accuracy}%`} sub={quizzes.length ? t("progress.acrossQuizzes", { n: quizzes.length }) : t("progress.noQuiz")} testid="stat-accuracy" />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("progress.treeTitle")}</CardTitle>
          <CardDescription>{t("progress.treeLede")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SkillTree goal={goal} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t("progress.ringsTitle")}</CardTitle>
          <CardDescription>{t("progress.ringsLede")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="mastery-rings">
            {skills.map((s) => (
              <li key={s.name} className="flex items-center gap-4 rounded-lg border p-3">
                <MasteryRing current={s.currentRank} required={s.requiredRank} label={t("progress.ringAria", { name: s.name, current: t(`levels.${LEVELS[s.currentRank]}`), required: t(`levels.${LEVELS[s.requiredRank]}`) })} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(`levels.${LEVELS[s.currentRank]}`)} → {t(`levels.${LEVELS[s.requiredRank]}`)}
                    {s.mastered && <span className="ml-2 text-success">{t("common.mastered")}</span>}
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
            <CardTitle>{t("progress.lineTitle")}</CardTitle>
            <CardDescription>{t("progress.lineLede")}</CardDescription>
          </CardHeader>
          <CardContent>
            <MasteryLine goal={goal} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("progress.barsTitle")}</CardTitle>
            <CardDescription>{t("progress.barsLede")}</CardDescription>
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
