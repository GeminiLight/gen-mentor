"use client";

import { Check } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PHASES = ["phaseDetails", "phaseReview", "phasePath"] as const;

export function EntryPhases({ phase }: { phase: number }) {
  const { t } = useT();
  const reduce = useReducedMotion();
  return <LayoutGroup id="entry-phases"><ol aria-label={t("entry.phaseLabel")} className="entry-phases">
    {PHASES.map((key, i) => <li key={key} aria-current={phase === i ? "step" : undefined}
      className={cn("relative flex min-w-0 items-center gap-3 py-4 text-xs transition-colors", phase === i ? "font-medium text-foreground" : "text-muted-foreground")}>
      {phase === i && <motion.span layoutId="phase-indicator" className="phase-indicator" transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }} aria-hidden />}
      <span className={cn("num relative flex size-6 shrink-0 items-center justify-center text-xs", phase >= i && "text-brand")} aria-hidden>
        {phase > i ? <Check className="stage-check size-3.5" /> : `0${i + 1}`}
      </span>
      <span className="relative leading-relaxed">{t(`entry.${key}`)}</span>
    </li>)}
  </ol></LayoutGroup>;
}
