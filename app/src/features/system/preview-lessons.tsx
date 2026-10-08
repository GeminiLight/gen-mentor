"use client";

import { BookOpen, ChevronDown, FlaskConical, Presentation, Target } from "lucide-react";
import { FeatureIcon } from "@/components/feature-icon";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "One", icon: BookOpen },
  { key: "Two", icon: FlaskConical },
  { key: "Three", icon: Presentation },
] as const;

/** Lesson details are editorial samples, not generated lessons or mastery evidence. */
export function PreviewLessons({ example, expanded, onExpand }: {
  example: "data" | "agents" | "career";
  expanded: number | null;
  onExpand: (value: number | null) => void;
}) {
  const { t } = useT();
  return <ol className="relative mt-6">
    {STEPS.map(({ key, icon }, i) => {
      const open = expanded === i;
      const id = "sample-lesson-" + i;
      return <li key={key} className="relative pb-3 last:pb-0">
        {i < 2 && <span aria-hidden className="absolute top-11 bottom-0 left-4 border-l border-dashed border-brand/30" />}
        <h3>
          <button type="button" onClick={() => onExpand(open ? null : i)} aria-expanded={open} aria-controls={id} id={id + "-heading"}
            className="group relative flex min-h-14 w-full items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <FeatureIcon icon={icon} className={cn("relative transition-colors", !open && "border-border bg-background text-muted-foreground shadow-none group-hover:border-brand/30 group-hover:text-brand")} />
            <span className="min-w-0 flex-1">
              <span className="mb-1 block text-xs font-normal text-muted-foreground">{t("entry.previewLesson", { n: i + 1 })}</span>
              <span className={cn("block text-sm font-medium leading-relaxed transition-colors", open ? "text-brand" : "group-hover:text-brand")}>{t(`entry.${example}${key}`)}</span>
            </span>
            <ChevronDown className={cn("mr-1 size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
          </button>
        </h3>
        <div id={id} role="region" aria-labelledby={id + "-heading"} aria-hidden={!open} inert={!open} data-open={open} className="disclosure-grid">
          <div className="min-h-0 overflow-hidden"><div key={example} className="disclosure-content ml-12 border-l border-brand/20 py-2 pl-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{t(`entry.${example}${key}Detail`)}</p>
            <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-brand"><Target className="mt-0.5 size-3.5 shrink-0" aria-hidden />{t(`entry.${example}${key}Practice`)}</p>
          </div></div>
        </div>
      </li>;
    })}
  </ol>;
}
