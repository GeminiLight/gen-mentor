import { useT } from "@/lib/i18n";

/** Explain the real learning loop before asking a newcomer to commit to it. */
export function LearningMethod() {
  const { t } = useT();
  return (
    <section id="learning-method" className="scroll-mt-8 border-t py-10 sm:py-12" aria-labelledby="method-heading">
      <div className="mb-8 grid gap-3 sm:grid-cols-2 sm:gap-12">
        <h2 id="method-heading" className="font-editorial text-xl font-normal leading-snug">{t("entry.methodTitle")}</h2>
        <p className="max-w-(--w-col) text-sm leading-relaxed text-muted-foreground">{t("entry.methodIntro")}</p>
      </div>
      <ol className="grid gap-7 sm:grid-cols-3 sm:gap-8">
        {(["Shape", "Learn", "Reflect"] as const).map((step, i) => (
          <li key={step} className="border-t pt-5">
            <span className="num text-xs text-muted-foreground" aria-hidden>0{i + 1}</span>
            <h3 className="mt-4 text-base font-medium">{t(`entry.method${step}`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`entry.method${step}Body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
