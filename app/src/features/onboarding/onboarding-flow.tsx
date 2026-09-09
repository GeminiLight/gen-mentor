"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StageList } from "@/components/stage-list";
import { useT, type Key } from "@/lib/i18n";
import { GoalForm, type GoalFormValues } from "./goal-form";
import { STEPS, useOnboarding } from "./use-onboarding";

export function OnboardingFlow() {
  const { run, retry, status, preview, error, running } = useOnboarding();
  const { t } = useT();
  const started = Object.values(status).some((s) => s !== "pending");
  const submit = (v: GoalFormValues) => void run(v);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <GoalForm disabled={running} onSubmit={submit} />

      <aside className="space-y-6 lg:border-l lg:pl-10" aria-label={t("progress.title")}>
        {!started ? (
          <div className="text-sm text-muted-foreground lg:pt-1">
            <p className="font-medium text-foreground">{t("onboarding.whatNext")}</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5">
              {STEPS.map((s) => (
                <li key={s.key}>{t(s.label)}</li>
              ))}
            </ol>
            <p className="mt-4 text-xs">{t("onboarding.note")}</p>
          </div>
        ) : (
          <>
            <StageList stages={STEPS.map((s) => ({ key: s.key, label: t(s.label), status: status[s.key] }))} />

            {preview.refined_goal && (
              <section className="space-y-1.5">
                <p className="eyebrow">{t("onboarding.refinedGoal")}</p>
                <p className="text-sm leading-relaxed">{preview.refined_goal}</p>
              </section>
            )}
            {preview.gaps && (
              <section className="space-y-2">
                <p className="eyebrow">{t("onboarding.skillGap")}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {preview.gaps.map((g) => (
                    <li key={g.name}>
                      <Badge variant="outline" className={g.is_gap ? "border-warning/40 bg-warning-soft text-warning" : "border-success/40 bg-success-soft text-success"}>
                        {g.name} · {t(`levels.${g.current_level}` as Key)} → {t(`levels.${g.required_level}` as Key)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {preview.path?.learning_path && (
              <section className="space-y-2" aria-live="polite">
                <p className="eyebrow">{t("onboarding.pathShaping")}</p>
                <ol className="space-y-1.5 text-sm">
                  {preview.path.learning_path.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="num w-6 shrink-0 text-muted-foreground">{i + 1}</span>
                      <span>{s?.title ?? "…"}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {error && (
              <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive-soft p-4 text-sm">
                <p className="font-medium text-destructive">{t("onboarding.failedTitle")}</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="sm" onClick={retry} data-testid="onboarding-retry">
                    {t("common.tryAgain")}
                  </Button>
                  <span className="text-xs text-muted-foreground">{t("onboarding.retryHint")}</span>
                </div>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
