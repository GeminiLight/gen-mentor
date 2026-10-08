"use client";

import { useId, useState } from "react";
import { Target, BriefcaseBusiness, SlidersHorizontal, HardDrive, ChevronDown, CircleHelp } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useOnboardingDraft } from "@/lib/store/onboarding-draft";

export function EntryGuide() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const id = useId();
  const count = useOnboardingDraft((s) => s.count);
  const icons = { Goal: Target, Background: BriefcaseBusiness, Control: SlidersHorizontal };
  const tips = <ol className="space-y-6">
    {(["Goal", "Background", "Control"] as const).map((kind) => { const Icon = icons[kind]; return <li key={kind} className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.6} aria-hidden />
      <div><h3 className="text-sm font-medium">{t(`entry.help${kind}`)}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`entry.help${kind}Body`)}</p></div>
    </li>; })}
  </ol>;
  return <aside className="entry-guide border-t pt-2">
    <h2>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id} id={id + "-trigger"} className="group flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md text-left text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
        <CircleHelp className="size-4" aria-hidden /><span>{t("entry.helpTitle")}</span><ChevronDown className="ml-auto size-4 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none" aria-hidden />
      </button>
      </h2>
      <div id={id} role="region" aria-labelledby={id + "-trigger"} aria-hidden={!open} inert={!open} data-open={open} className="disclosure-grid"><div className="min-h-0 overflow-hidden">
      <div className="disclosure-content space-y-5 pb-5 pt-3">{tips}
        <div className="space-y-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground"><p>{t("entry.uploadHelp")}</p><p>{t(!count || count === "0" ? "polish.adaptiveCountHelp" : "polish.countHelp")}</p></div>
      </div>
      </div></div>
    <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><HardDrive className="mt-0.5 size-3.5 shrink-0" aria-hidden />{t("entry.privacy")}</p>
  </aside>;
}
