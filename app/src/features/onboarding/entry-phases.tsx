import { Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function EntryPhases({ phase }: { phase: number }) {
  const { t } = useT();
  return <ol aria-label={t("entry.phaseLabel")} className="mb-6 grid grid-cols-3 gap-3 border-b pb-5">
    {(["phaseDetails", "phaseReview", "phasePath"] as const).map((key, i) => <li key={key} aria-current={phase === i ? "step" : undefined} className={cn("flex min-w-0 flex-col gap-2 text-xs sm:flex-row sm:items-center", phase === i ? "font-medium text-foreground" : "text-muted-foreground")}>
      <span className={cn("num flex size-6 shrink-0 items-center justify-center rounded-full border", phase === i && "border-brand bg-brand text-brand-foreground")} aria-hidden>{phase > i ? <Check className="size-3" /> : i + 1}</span>
      <span>{t(`entry.${key}`)}</span>
    </li>)}
  </ol>;
}
