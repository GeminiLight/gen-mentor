import { useT } from "@/lib/i18n";

/** Explain the real learning loop before asking a newcomer to commit to it. */
export function LearningMethod() {
  const { t } = useT();
  return (
    <section id="learning-method" className="scroll-mt-8 py-14 sm:py-20" aria-labelledby="method-heading">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-16">
        <h2 id="method-heading" className="display max-w-(--w-col) text-xl">{t("entry.methodTitle")}</h2>
        <p className="max-w-(--w-col) text-sm leading-relaxed text-muted-foreground lg:pt-2">{t("entry.methodIntro")}</p>
      </div>
      <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
        {(["Shape", "Learn", "Reflect"] as const).map((step, i) => (
          <li key={step} className="border-t border-foreground/15 pt-5">
            <span className="chapter-num block text-xl" aria-hidden>0{i + 1}</span>
            <h3 className="mt-6 text-base font-medium">{t(`entry.method${step}`)}</h3>
            <p className="mt-2 max-w-(--w-col) text-sm leading-relaxed text-muted-foreground">{t(`entry.method${step}Body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
