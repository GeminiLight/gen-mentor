"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { GoalForm } from "./goal-form";
import { EntryGuide } from "./entry-guide";
import { EntryPhases } from "./entry-phases";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnboarding } from "./use-onboarding";
import { StartingPointReview } from "./starting-point-review";
import { ReviewControls } from "./review-controls";
import { OnboardingProgress } from "./onboarding-progress";

export function OnboardingFlow() {
  const flow = useOnboarding();
  const { run, retry, status, preview, error, running, review, back } = flow;
  const { t } = useT();
  const started = Object.values(status).some((s) => s !== "pending");
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef(started);
  useEffect(() => {
    if (previous.current === started) return;
    previous.current = started;
    const frame = requestAnimationFrame(() => heading.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [started]);
  const building = status.profile !== "pending" || status.path !== "pending";
  return (
    <>
      <EntryPhases phase={started ? building ? 2 : 1 : 0} />
      <div className="mb-6 max-w-(--w-measure)">
        <p className="eyebrow mb-3">{t(started ? "review.eyebrow" : "entry.eyebrow")}</p>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold">{t(started ? review ? "review.title" : "review.preparingTitle" : "onboarding.title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(started ? review ? "review.intro" : "review.preparingHelp" : "entry.formIntro")}</p>
      </div>
      <div className="rounded-xl border bg-card p-5 sm:p-6">
        {!started ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <GoalForm disabled={running} onSubmit={(v) => void run(v)} />
            <EntryGuide />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between"><Button variant="ghost" size="sm" onClick={back}><ArrowLeft className="size-4" aria-hidden />{t("review.back")}</Button><span className="text-xs text-muted-foreground">{t("polish.savedDraft")}</span></div>
            <OnboardingProgress status={status} reviewing={!!review} />
            {running && <section className="space-y-3 rounded-lg bg-muted/40 p-5" role="status" data-loading="true">
              <h2 className="text-sm font-medium">{t(building ? "entry.buildingTitle" : "entry.workingTitle")}</h2>
              <p className="max-w-(--w-measure) text-sm leading-relaxed text-muted-foreground">{t(building ? "entry.buildingBody" : "entry.workingBody")}</p>
              {!preview.refined_goal && <div aria-hidden className="space-y-2 pt-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>}
            </section>}
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
