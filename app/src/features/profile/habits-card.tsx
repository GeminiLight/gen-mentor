"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import type { Goal } from "@/lib/store";
import { activitySummary } from "@/lib/store/derive";

/**
 * Habits from the archive, not from the model. The profiler's `behavioral_patterns` is a guess
 * made before any session happened; showing it as fact would break the one rule of this product.
 */
export function HabitsCard({ goal }: { goal: Goal }) {
  const { t, fmtDate } = useT();
  const a = activitySummary(goal);
  const stats: { label: string; value: string }[] = [
    { label: t("profile.habitsDays"), value: String(a.activeDays) },
    { label: t("profile.habitsOpened"), value: `${a.opened} / ${goal.learning_path.length}` },
    { label: t("profile.habitsCompleted"), value: `${a.completed} / ${goal.learning_path.length}` },
    { label: t("profile.habitsAvg"), value: a.avgMinutes === null ? "—" : t("common.minutes", { n: a.avgMinutes }) },
  ];
  return (
    <Card data-testid="habits-card">
      <CardHeader>
        <CardTitle>{t("profile.behavior")}</CardTitle>
        <CardDescription>{t("profile.habitsNote")}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {a.opened === 0 ? (
          <p className="text-muted-foreground">{t("profile.habitsNone")}</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="num mt-0.5 text-lg font-semibold">{s.value}</dd>
                </div>
              ))}
            </dl>
            {a.lastActive !== null && <p className="mt-4 text-xs text-muted-foreground">{t("profile.habitsLast", { date: fmtDate(a.lastActive) })}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
