import { Target, BriefcaseBusiness, SlidersHorizontal, HardDrive } from "lucide-react";
import { useT } from "@/lib/i18n";

export function EntryGuide() {
  const { t } = useT();
  const icons = { Goal: Target, Background: BriefcaseBusiness, Control: SlidersHorizontal };
  const tips = <ol className="space-y-6">
    {(["Goal", "Background", "Control"] as const).map((kind) => { const Icon = icons[kind]; return <li key={kind} className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.6} aria-hidden />
      <div><h3 className="text-sm font-medium">{t(`entry.help${kind}`)}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`entry.help${kind}Body`)}</p></div>
    </li>; })}
  </ol>;
  return <aside className="space-y-6 border-t pt-5 lg:rounded-lg lg:border-0 lg:bg-brand-soft/50 lg:p-6">
    <details className="lg:hidden"><summary className="cursor-pointer py-3 text-sm font-medium outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"><h2 className="inline">{t("entry.helpTitle")}</h2></summary><div className="pt-5">{tips}</div></details>
    <div className="hidden space-y-6 lg:block"><h2 className="text-sm font-semibold">{t("entry.helpTitle")}</h2>{tips}</div>
    <p className="flex items-start gap-2 border-t pt-5 text-xs leading-relaxed text-muted-foreground"><HardDrive className="mt-0.5 size-4 shrink-0" aria-hidden />{t("entry.privacy")}</p>
  </aside>;
}
