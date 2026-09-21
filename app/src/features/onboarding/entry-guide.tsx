import { Target, BriefcaseBusiness, SlidersHorizontal, HardDrive, ChevronDown, CircleHelp } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useOnboardingDraft } from "@/lib/store/onboarding-draft";

export function EntryGuide() {
  const { t } = useT();
  const count = useOnboardingDraft((s) => s.count);
  const icons = { Goal: Target, Background: BriefcaseBusiness, Control: SlidersHorizontal };
  const tips = <ol className="space-y-6">
    {(["Goal", "Background", "Control"] as const).map((kind) => { const Icon = icons[kind]; return <li key={kind} className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.6} aria-hidden />
      <div><h3 className="text-sm font-medium">{t(`entry.help${kind}`)}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`entry.help${kind}Body`)}</p></div>
    </li>; })}
  </ol>;
  return <aside className="mt-6 border-t pt-2">
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
        <CircleHelp className="size-4" aria-hidden /><h2>{t("entry.helpTitle")}</h2><ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="space-y-5 pb-5 pt-3">{tips}
        <div className="space-y-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground"><p>{t("entry.uploadHelp")}</p><p>{t(!count || count === "0" ? "polish.adaptiveCountHelp" : "polish.countHelp")}</p></div>
      </div>
    </details>
    <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><HardDrive className="mt-0.5 size-3.5 shrink-0" aria-hidden />{t("entry.privacy")}</p>
  </aside>;
}
