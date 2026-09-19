"use client";

import { useState } from "react";
import { BookOpen, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export const EXAMPLES = ["data", "agents", "career"] as const;

/** Editorial examples, never represented as generated work or learner progress. */
export function PathPreview() {
  const { t } = useT();
  const [example, setExample] = useState<typeof EXAMPLES[number]>("data");
  return <section className="min-w-0 rounded-xl border bg-card" aria-labelledby="preview-heading" data-testid="path-preview">
    <div className="border-b px-5 py-5 sm:px-7">
      <h2 id="preview-heading" className="text-sm font-medium">{t("entry.preview")}</h2>
      <div className="mt-4 flex flex-wrap gap-1" role="group" aria-label={t("entry.exampleLabel")}>
        {EXAMPLES.map((key) => <Button key={key} variant={key === example ? "secondary" : "ghost"} size="sm" className="min-h-11" aria-pressed={example === key} onClick={() => setExample(key)}>{t(`entry.${key}`)}</Button>)}
      </div>
    </div>
    <div className="px-5 py-6 sm:px-7" aria-live="polite" aria-atomic="true">
      <p className="text-lg font-medium leading-relaxed">{t(`entry.${example}Goal`)}</p>
      <ArrowDown className="my-5 size-4 text-muted-foreground" aria-hidden />
      <ol className="space-y-5">
        {(["One", "Two", "Three"] as const).map((step, i) => <li key={step} className="flex gap-4">
          <span className="num flex size-7 shrink-0 items-center justify-center rounded-full border text-xs text-muted-foreground" aria-hidden>{i + 1}</span>
          <div><span className="sr-only">{t("entry.previewLesson", { n: i + 1 })}</span><h3 className="pt-0.5 text-sm font-medium leading-relaxed">{t(`entry.${example}${step}`)}</h3></div>
        </li>)}
      </ol>
    </div>
    <div className="space-y-3 border-t bg-muted/30 px-5 py-5 sm:px-7">
      <p className="flex items-start gap-2 text-sm leading-relaxed"><BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />{t("entry.previewOutcome")}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("entry.previewNote")}</p>
    </div>
  </section>;
}
