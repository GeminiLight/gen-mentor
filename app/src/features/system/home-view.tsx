"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { LangToggle } from "@/components/lang-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { cn } from "@/lib/utils";
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
      <div className={cn(!returning && "border-b bg-wash")}>
      <header className="mx-auto flex w-full max-w-(--w-content) items-center justify-between px-5 py-5 sm:px-6">
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

      {!returning && <section className="mx-auto grid w-full max-w-(--w-content) items-start gap-12 px-5 pt-8 pb-14 sm:px-6 sm:pt-14 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-16">
        <div className="min-w-0 lg:pt-14">
          <p className="eyebrow mb-6 flex items-center gap-3 text-brand"><span className="h-px w-8 bg-current" aria-hidden />{t("entry.eyebrow")}</p>
          <h1 className="display max-w-(--w-col) text-2xl">{t("entry.title")}</h1>
          <p className="mt-6 max-w-(--w-col) text-base leading-relaxed text-muted-foreground">{t("entry.lede")}</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3" data-hydrated={hydrated ? "" : undefined}>
            <Button size="lg" asChild className="min-h-12 gap-5 rounded-md px-6"><Link href="/onboarding">{t(hydrated && draft ? "entry.resume" : "home.cta")}<ArrowRight data-icon="inline-end" aria-hidden /></Link></Button>
            <a href="#path-example" className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm text-foreground underline decoration-border underline-offset-[6px] hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring">{t("entry.explore")}<ArrowDown className="size-4" aria-hidden /></a>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{t(hydrated && draft ? "entry.draftNote" : "home.noAccount")}</p>
        </div>
        <PathPreview />
      </section>}
      </div>

      {returning ? <LearningDesk goal={goal} /> : (
        <div className="mx-auto w-full max-w-(--w-content) px-5 pb-8 sm:px-6"><LearningMethod /></div>
      )}

      <footer className="mx-auto flex w-full max-w-(--w-content) flex-wrap items-center gap-x-6 gap-y-3 border-t px-5 py-6 text-xs text-muted-foreground sm:px-6">
        <span className="mr-auto">GenMentor · WWW 2025</span>
        <a href="https://arxiv.org/pdf/2501.15749" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-foreground">
          {t("home.paper")}
        </a>
        <a href="https://github.com/GeminiLight/gen-mentor" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-foreground">
          {t("home.source")}
        </a>
      </footer>
    </main>
  );
}
