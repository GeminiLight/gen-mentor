"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { GoalForm } from "./goal-form";
import { STEPS } from "./onboarding-state";
import { useOnboarding } from "./use-onboarding";
import { StartingPointReview } from "./starting-point-review";
import { ReviewControls } from "./review-controls";
import { OnboardingProgress } from "./onboarding-progress";

export function OnboardingFlow() {
  const flow = useOnboarding();
  const { run, retry, status, preview, error, running, review, back } = flow;
  const { t } = useT();
  const started = Object.values(status).some((s) => s !== "pending");
  return (
    <>
      <div className="mb-8 max-w-(--w-measure)">
        <p className="eyebrow mb-3">{t(started ? "review.eyebrow" : "polish.startSmall")}</p>
        <h1 className="text-xl font-semibold tracking-tight">{t(started ? review ? "review.title" : "review.preparingTitle" : "onboarding.title")}</h1>
        {started && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(review ? "review.intro" : "review.preparingHelp")}</p>}
      </div>
      <div className="rounded-xl border bg-card p-5 sm:p-8">
        {!started ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <GoalForm disabled={running} onSubmit={(v) => void run(v)} />
            <aside className="text-sm text-muted-foreground lg:border-l lg:pl-10">
              <p className="font-medium text-foreground">{t("onboarding.whatNext")}</p>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5">
                {STEPS.map((s) => <li key={s.key}>{t(s.label)}</li>)}
              </ol>
              <p className="mt-4 text-xs">{t("review.firstVisitHelp")}</p>
            </aside>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between"><Button variant="ghost" size="sm" onClick={back}><ArrowLeft className="size-4" aria-hidden />{t("review.back")}</Button><span className="text-xs text-muted-foreground">{t("polish.savedDraft")}</span></div>
            <OnboardingProgress status={status} reviewing={!!review} />
            {preview.refined_goal && <StartingPointReview flow={flow} />}
            {preview.path?.learning_path && !review && (
              <section className="space-y-2" aria-live="polite">
                <p className="eyebrow">{t("onboarding.pathShaping")}</p>
                <ol className="space-y-2 text-sm">
                  {preview.path.learning_path.map((s, i) => <li key={i} className="flex gap-3"><span className="num w-6 shrink-0 text-muted-foreground">{i + 1}</span><span>{s?.title ?? "…"}</span></li>)}
                </ol>
              </section>
            )}
            {error && (
              <div role="alert" className="space-y-3 rounded-lg border border-destructive/40 bg-destructive-soft p-4 text-sm">
                <p className="font-medium text-destructive">{t("onboarding.failedTitle")}</p><p className="text-muted-foreground">{error}</p>
                <div className="flex flex-wrap items-center gap-3"><Button variant="outline" size="sm" onClick={retry} data-testid="onboarding-retry">{t("common.tryAgain")}</Button><span className="text-xs text-muted-foreground">{t("onboarding.retryHint")}</span></div>
              </div>
            )}
            {review && <ReviewControls review={review} ready={!!preview.gaps} onConfirm={flow.confirm} onExtend={flow.extend} />}
          </div>
        )}
      </div>
    </>
  );
}
