"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const LEVEL_STROKE = ["stroke-level-0", "stroke-level-1", "stroke-level-2", "stroke-level-3"];

/**
 * A ring in three segments, one per proficiency step. Filled segments are the learner's
 * current level, hollow ones the distance to the required level, dimmed ones beyond it.
 * Driven only by the profile; there is no way to fill it without the profiler moving.
 */
export function MasteryRing({ current, required, size = 64, label, children }: { current: number; required: number; size?: number; label: string; children?: React.ReactNode }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const gap = 6;
  const seg = c / 3 - gap;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="shrink-0">
      {[0, 1, 2].map((i) => {
        const filled = i < current;
        const needed = i < required;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={filled ? 6 : 3}
            strokeLinecap="round"
            strokeDasharray={`${seg} ${c - seg}`}
            strokeDashoffset={-(i * (c / 3)) + c / 4}
            className={cn("transition-all duration-(--dur-slow)", filled ? LEVEL_STROKE[current] : needed ? "stroke-border" : "stroke-muted/60")}
          />
        );
      })}
      {children}
    </svg>
  );
}

/** Overall progress as a single arc; the number is the profile's own `overall_progress`. */
export function ProgressRing({ value, size = 120 }: { value: number; size?: number }) {
  const { t } = useT();
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={t("progress.overallAria", { n: pct })} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8} className="stroke-muted" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stroke-brand transition-all duration-(--dur-slow)"
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="num fill-foreground text-xl font-semibold" data-testid="overall-ring-value">
        {pct}%
      </text>
    </svg>
  );
}
