import { useT } from "@/lib/i18n";

export function EntryGuide() {
  const { t } = useT();
  const tips = <ol className="space-y-6">
    {(["Goal", "Background", "Control"] as const).map((kind, i) => <li key={kind} className="flex gap-3">
      <span className="num pt-0.5 text-xs text-muted-foreground">0{i + 1}</span>
      <div><h3 className="text-sm font-medium">{t(`entry.help${kind}`)}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`entry.help${kind}Body`)}</p></div>
    </li>)}
  </ol>;
  return <aside className="space-y-6 border-t pt-5 lg:border-t-0 lg:border-l lg:pt-1 lg:pl-10">
    <details className="lg:hidden"><summary className="cursor-pointer py-3 text-sm font-medium outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"><h2 className="inline">{t("entry.helpTitle")}</h2></summary><div className="pt-5">{tips}</div></details>
    <div className="hidden space-y-6 lg:block"><h2 className="text-sm font-semibold">{t("entry.helpTitle")}</h2>{tips}</div>
    <p className="border-t pt-5 text-xs leading-relaxed text-muted-foreground">{t("entry.privacy")}</p>
  </aside>;
}
