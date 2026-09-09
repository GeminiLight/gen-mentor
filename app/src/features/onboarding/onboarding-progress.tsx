import { StageList, type StageStatus } from "@/components/stage-list";
import { useT } from "@/lib/i18n";
import { STEPS, type Step } from "./onboarding-state";

export function OnboardingProgress({ status, reviewing }: { status: Record<Step, StageStatus>; reviewing: boolean }) {
  const { t } = useT();
  return (
    <div className="grid grid-cols-2 gap-4 border-b pb-6 lg:grid-cols-4" aria-label={t("progress.title")}>
      {STEPS.map((step) => <StageList key={step.key} stages={[{ ...step, label: t(step.label), status: status[step.key], detail: step.key === "profile" && reviewing ? t("review.afterConfirmation") : undefined }]} />)}
    </div>
  );
}
