import { Check, PencilLine, ListChecks, Route } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PHASES = [
  { key: "phaseDetails", icon: PencilLine },
  { key: "phaseReview", icon: ListChecks },
  { key: "phasePath", icon: Route },
] as const;

export function EntryPhases({ phase }: { phase: number }) {
  const { t } = useT();
  return <ol aria-label={t("entry.phaseLabel")} className="mb-8 grid grid-cols-3 gap-3 sm:gap-6">
    {PHASES.map(({ key, icon: Icon }, i) => <li key={key} aria-current={phase === i ? "step" : undefined}
      className={cn("flex min-w-0 flex-col gap-3 border-b-2 pb-4 text-xs sm:flex-row sm:items-center", phase === i ? "border-brand font-medium text-foreground" : "border-border text-muted-foreground")}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border", phase === i ? "border-brand/15 bg-primary text-primary-foreground" : "border-border bg-card")} aria-hidden>
        {phase > i ? <Check className="size-4" /> : <Icon className="size-4" />}
      </span>
      <span><span className="num mr-1.5 text-muted-foreground" aria-hidden>0{i + 1}</span>{t(`entry.${key}`)}</span>
    </li>)}
  </ol>;
}
