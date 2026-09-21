"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { LangToggle } from "@/components/lang-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { LearningDesk } from "./learning-desk";
import { HealthBadge } from "./health-badge";
import { PathPreview } from "./path-preview";
import { LearningMethod } from "./learning-method";
import { useOnboardingDraft } from "@/lib/store/onboarding-draft";

/** Returning learners see their goal and the next session before the fold; newcomers get the goal form. */
export function HomeView() {
  const { t } = useT();
  const { goals, hydrated } = useArchive();
  const goal = useActiveGoal();
  const draft = useOnboardingDraft((s) => !!(s.goal || s.info));
  const returning = hydrated && goals.length > 0 && goal;
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-(--w-content) items-center justify-between border-b px-6 py-5">
        <Brand size={24} />
        {!returning && <nav aria-label={t("entry.pageNavigation")} className="hidden items-center gap-7 text-xs text-muted-foreground lg:flex">
          <a href="#path-example" className="rounded-sm py-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">{t("entry.explore")}</a>
          <a href="#learning-method" className="rounded-sm py-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">{t("entry.methodNav")}</a>
        </nav>}
        <div className="flex items-center gap-2">
          <HealthBadge />
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      {returning ? <LearningDesk goal={goal} /> : (
      <div className="mx-auto w-full max-w-(--w-content) px-5 pb-8 sm:px-6">
        <section className="grid items-center gap-12 py-10 sm:py-16 lg:grid-cols-2 lg:gap-20">
          <div className="min-w-0">
            <p className="eyebrow mb-6 flex items-center gap-3"><span className="h-px w-8 bg-brand" aria-hidden />{t("entry.eyebrow")}</p>
            <h1 className="max-w-(--w-col) font-editorial text-2xl font-normal leading-tight text-balance">{t("entry.title")}</h1>
            <p className="mt-5 max-w-(--w-col) text-base leading-relaxed text-muted-foreground">{t("entry.lede")}</p>
            <div className="mt-7 space-y-3" data-hydrated={hydrated ? "" : undefined}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button size="lg" asChild className="min-h-12 gap-6 px-6"><Link href="/onboarding">{t(hydrated && draft ? "entry.resume" : "home.cta")}<ArrowRight aria-hidden /></Link></Button>
                <a href="#path-example" className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">{t("entry.explore")}<ArrowDown className="size-4" aria-hidden /></a>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{t(hydrated && draft ? "entry.draftNote" : "home.noAccount")}</p>
            </div>
            <p className="mt-6 max-w-(--w-col) text-xs leading-relaxed text-muted-foreground">{t("entry.setupNote")}</p>
          </div>
          <PathPreview />
        </section>
        <LearningMethod />
      </div>

      )}

      <footer className="mx-auto flex w-full max-w-(--w-content) flex-wrap items-center gap-x-5 gap-y-3 border-t px-6 py-6 text-xs text-muted-foreground">
        <span className="mr-auto">{t("home.noAccount")}</span>
        <span>WWW 2025</span>
        <a href="https://arxiv.org/pdf/2501.15749" target="_blank" rel="noreferrer" className="hover:text-foreground">
          {t("home.paper")}
        </a>
        <a href="https://github.com/GeminiLight/gen-mentor" target="_blank" rel="noreferrer" className="hover:text-foreground">
          {t("home.source")}
        </a>
      </footer>
    </main>
  );
}
