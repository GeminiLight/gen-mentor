"use client";
import { useT } from "@/lib/i18n";
import type { SessionItem } from "@/lib/schemas";

export function LessonOutcomes({ session }: { session: SessionItem }) {
  const { t } = useT();
  if (!session.desired_outcome_when_completed.length) return null;
  return <div className="min-w-0">
    <h3 className="text-sm font-medium">{t("journey.outcome")}</h3>
    <ul className="mt-3 divide-y">
      {session.desired_outcome_when_completed.map((outcome, i) => <li key={`${outcome.name}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm">
        <span className="min-w-0 wrap-anywhere">{outcome.name}</span>
        <span className="text-xs text-muted-foreground">{t("journey.targetLevel", { level: t(`levels.${outcome.level}`) })}</span>
      </li>)}
    </ul>
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("journey.targetHint")}</p>
  </div>;
}
