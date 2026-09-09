"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { learnedCount, skillLevels, totalMinutes } from "@/lib/store/derive";
import { MasteryLine, MinutesBars } from "./footprint";
import { MasteryRing, ProgressRing } from "./mastery-ring";
import { SkillTree } from "./skill-tree";

const LEVELS = ["unlearned", "beginner", "intermediate", "advanced"] as const;

/** Every number is a view over the archive. Sections are headed, not boxed. */
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
      <PageHeader title={t("progress.title")} />

      <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
        <ProgressRing value={profile.cognitive_status.overall_progress} size={104} />
        <dl className="flex flex-wrap gap-x-12 gap-y-4 text-sm">
          <Stat label={t("progress.skillsMastered")} value={`${profile.cognitive_status.mastered_skills.length} / ${skills.length}`} testid="stat-mastered" />
          <Stat label={t("progress.sessions")} value={`${learned} / ${goal.learning_path.length}`} sub={minutes > 0 ? t("progress.minutesReading", { n: minutes }) : undefined} testid="stat-sessions" />
          <Stat label={t("progress.accuracy")} value={accuracy === null ? "—" : `${accuracy}%`} sub={quizzes.length ? t("progress.acrossQuizzes", { n: quizzes.length }) : undefined} testid="stat-accuracy" />
        </dl>
      </div>

      <Section title={t("progress.treeTitle")}>
        <SkillTree goal={goal} />
      </Section>

      <Section title={t("progress.ringsTitle")}>
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="mastery-rings">
          {skills.map((s) => (
            <li key={s.name} className="flex items-center gap-4">
              <MasteryRing current={s.currentRank} required={s.requiredRank} size={52} label={t("progress.ringAria", { name: s.name, current: t(`levels.${LEVELS[s.currentRank]}`), required: t(`levels.${LEVELS[s.requiredRank]}`) })} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`levels.${LEVELS[s.currentRank]}`)} → {t(`levels.${LEVELS[s.requiredRank]}`)}
                  {s.mastered && <span className="ml-2 text-success">{t("common.mastered")}</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-x-12 lg:grid-cols-2">
        <Section title={t("progress.lineTitle")}>
          <MasteryLine goal={goal} />
        </Section>
        <Section title={t("progress.barsTitle")}>
          <MinutesBars goal={goal} />
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="mb-5 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, sub, testid }: { label: string; value: string; sub?: string; testid?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5 text-lg font-semibold" data-testid={testid}>
        {value}
      </dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}
