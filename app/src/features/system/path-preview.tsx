"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, ChartNoAxesCombined, Workflow, BriefcaseBusiness, Compass } from "lucide-react";
import { FeatureIcon } from "@/components/feature-icon";
import { PreviewLessons } from "./preview-lessons";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useArchive } from "@/lib/store";
import { useOnboardingDraft } from "@/lib/store/onboarding-draft";

export const EXAMPLES = ["data", "agents", "career"] as const;
const EXAMPLE_ICONS = { data: ChartNoAxesCombined, agents: Workflow, career: BriefcaseBusiness };

/** A sample syllabus, never represented as generated work or learner progress. */
export function PathPreview() {
  const { t } = useT();
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
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="preview-heading" className="eyebrow flex items-center gap-2"><Compass className="size-4" aria-hidden />{t("entry.preview")}</h2>
        <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{t("entry.sample")}</span>
      </div>
      <div className="paper-panel overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap border-b bg-brand-soft/50 px-3" role="group" aria-label={t("entry.exampleLabel")}>
          {EXAMPLES.map((key) => { const Icon = EXAMPLE_ICONS[key]; return (
            <button key={key} type="button" aria-pressed={example === key} onClick={() => { setExample(key); setExpanded(0); }}
              className="relative inline-flex min-h-14 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 px-2 sm:flex-row sm:gap-2 sm:px-3 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring aria-pressed:font-medium aria-pressed:text-brand aria-pressed:after:absolute aria-pressed:after:inset-x-3 aria-pressed:after:bottom-0 aria-pressed:after:h-0.5 aria-pressed:after:bg-brand">
              <Icon className="size-4 shrink-0" aria-hidden />{t(`entry.${key}`)}
            </button>
          ); })}
        </div>
        <div className="px-5 pt-6 pb-6 sm:px-7 sm:pt-7" aria-live="polite" aria-atomic="true">
          <div className="flex items-start gap-4 border-b pb-5">
            <FeatureIcon icon={Compass} className="hidden size-12 rounded-full sm:inline-flex" />
            <div className="min-w-0"><p className="eyebrow mb-2">{t("onboarding.goalLabel")}</p>
              <p className="text-lg font-medium leading-snug text-balance">{t(`entry.${example}Goal`)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("entry.previewHint")}</p>
          <PreviewLessons example={example} expanded={expanded} onExpand={setExpanded} />
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t bg-brand-soft/30 px-5 py-4 sm:px-8">
          <p className="flex min-w-0 flex-1 basis-48 items-start gap-2 text-xs leading-relaxed text-muted-foreground"><BookOpen className="mt-0.5 size-4 shrink-0" aria-hidden />{t("entry.previewOutcome")}</p>
          <Button variant="ghost" className="min-h-11 px-0 text-brand hover:bg-transparent hover:text-foreground" onClick={useExample} disabled={!hydrated} data-testid="use-example">
            {t(hasDraft ? "entry.resume" : "entry.useExample")}<ArrowUpRight aria-hidden />
          </Button>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("entry.previewNote")}</p>
    </section>
  );
}
