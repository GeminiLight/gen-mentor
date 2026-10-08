import { StageList, type StageStatus } from "@/components/stage-list";
import { useT } from "@/lib/i18n";
import { STEPS, type Step } from "./onboarding-state";

export function OnboardingProgress({ status, reviewing }: { status: Record<Step, StageStatus>; reviewing: boolean }) {
  const { t } = useT();
  return (
    <div className="space-y-5 border-b pb-6" aria-label={t("progress.title")}>
      <div className="flex gap-1" aria-hidden>{STEPS.map((step) => <span key={step.key} className="stage-segment" data-status={status[step.key]}><span /></span>)}</div>
      <div className="grid grid-cols-2 gap-4">{STEPS.map((step) => <StageList key={step.key} stages={[{ ...step, label: t(step.label), status: status[step.key], detail: step.key === "profile" && reviewing ? t("review.afterConfirmation") : undefined }]} />)}</div>
    </div>
  );
}
