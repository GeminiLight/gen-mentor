"use client";

import { useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { PreviewLessons } from "./preview-lessons";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useArchive } from "@/lib/store";
import { useOnboardingDraft } from "@/lib/store/onboarding-draft";

export const EXAMPLES = ["data", "agents", "career"] as const;

/** A sample syllabus, never represented as generated work or learner progress. */
export function PathPreview() {
  const { t } = useT();
  const reduce = useReducedMotion();
  const router = useRouter();
  const hydrated = useArchive((s) => s.hydrated);
  const hasDraft = useOnboardingDraft((s) => !!(s.goal || s.info || s.checkpoint));
  const [example, setExample] = useState<typeof EXAMPLES[number]>("data");
  const [expanded, setExpanded] = useState<number | null>(0);
  const useExample = () => {
    // Read the latest draft at the action boundary; browsing examples must never replace it.
    const draft = useOnboardingDraft.getState();
    if (!draft.goal && !draft.info && !draft.checkpoint) draft.patch({ goal: t(`entry.${example}Goal`) });
    router.push("/onboarding");
  };
  return (
    <section id="path-example" className="min-w-0 scroll-mt-6" aria-labelledby="preview-heading" data-testid="path-preview">
      <div className="paper-panel overflow-hidden rounded-lg border bg-card">
        <div className="flex items-baseline justify-between gap-3 px-5 pt-5 sm:px-7">
          <h2 id="preview-heading" className="eyebrow">{t("entry.preview")}</h2>
          <span className="hidden text-xs text-muted-foreground sm:inline">{t("entry.sample")}</span>
        </div>
        <LayoutGroup id="sample-selector"><div className="mt-3 flex border-b px-3 sm:px-5" role="group" aria-label={t("entry.exampleLabel")}>
          {EXAMPLES.map((key) => (
            <button key={key} type="button" aria-pressed={example === key} onClick={() => { setExample(key); setExpanded(0); }}
              className="relative inline-flex min-h-12 min-w-0 flex-1 basis-0 items-center justify-center px-2 text-center text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring aria-pressed:font-medium aria-pressed:text-foreground sm:text-sm">
              {t(`entry.${key}`)}
              {example === key && <motion.span layoutId="sample-active" className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" transition={{ duration: reduce ? 0 : 0.24, ease: [0.2, 0, 0, 1] }} aria-hidden />}
            </button>
          ))}
        </div></LayoutGroup>
        <div className="px-5 pt-6 pb-5 sm:px-7 sm:pt-8" aria-live="polite" aria-atomic="true">
          <div key={example} className="surface-enter min-w-0">
            <p className="text-xs text-muted-foreground">{t("onboarding.goalLabel")}</p>
            <p className="display mt-2 text-lg leading-snug">{t(`entry.${example}Goal`)}</p>
          </div>
          <PreviewLessons example={example} expanded={expanded} onExpand={setExpanded} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-wash/60 px-5 py-3 sm:px-7">
          <p className="min-w-0 flex-1 basis-48 text-xs leading-relaxed text-muted-foreground">{t("entry.previewOutcome")}</p>
          <Button variant="ghost" className="min-h-11 px-0 text-brand hover:bg-transparent hover:text-foreground" onClick={useExample} disabled={!hydrated} data-testid="use-example">
            {t(hasDraft ? "entry.resume" : "entry.useExample")}<ArrowUpRight aria-hidden />
          </Button>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("entry.previewNote")}</p>
    </section>
  );
}
