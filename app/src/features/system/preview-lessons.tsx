"use client";

import { ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STEPS = ["One", "Two", "Three"] as const;

/** Lesson details are editorial samples, not generated lessons or mastery evidence. */
export function PreviewLessons({ example, expanded, onExpand }: {
  example: "data" | "agents" | "career";
  expanded: number | null;
  onExpand: (value: number | null) => void;
}) {
  const { t } = useT();
  return <ol className="mt-6 border-t">
    {STEPS.map((key, i) => {
      const open = expanded === i;
      const id = "sample-lesson-" + i;
      return <li key={key} className="border-b last:border-b-0">
        <h3>
          <button type="button" onClick={() => onExpand(open ? null : i)} aria-expanded={open} aria-controls={id} id={id + "-heading"}
            className="group flex min-h-14 w-full items-baseline gap-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className={cn("chapter-num w-7 shrink-0 text-lg transition-colors", open && "text-brand")} aria-hidden>0{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="sr-only">{t("entry.previewLesson", { n: i + 1 })} </span>
              <span className={cn("block text-sm font-medium leading-relaxed transition-colors", !open && "group-hover:text-brand")}>{t(`entry.${example}${key}`)}</span>
            </span>
            <ChevronDown className={cn("size-4 shrink-0 self-center text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
          </button>
        </h3>
        <div id={id} role="region" aria-labelledby={id + "-heading"} aria-hidden={!open} inert={!open} data-open={open} className="disclosure-grid">
          <div className="min-h-0 overflow-hidden"><div key={example} className="disclosure-content pb-5 pl-11">
            <p className="text-sm leading-relaxed text-muted-foreground">{t(`entry.${example}${key}Detail`)}</p>
            <p className="mt-3 border-l-2 border-primary/30 pl-3 text-xs leading-relaxed text-brand">{t(`entry.${example}${key}Practice`)}</p>
          </div></div>
        </div>
      </li>;
    })}
  </ol>;
}
