"use client";

import { ArrowRight, Check, HardDrive } from "lucide-react";
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
      <header className="mx-auto flex w-full max-w-(--w-content) items-center justify-between px-6 py-5">
        <Brand size={24} />
        <div className="flex items-center gap-2">
          <HealthBadge />
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      {returning ? <LearningDesk goal={goal} /> : (
      <div className="mx-auto w-full max-w-(--w-content) px-5 pb-8 sm:px-6">
        <section className="grid items-center gap-10 py-9 sm:py-14 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <p className="eyebrow mb-4">{t("entry.eyebrow")}</p>
            <h1 className="max-w-(--w-col) text-xl font-semibold leading-tight sm:text-2xl">{t("entry.title")}</h1>
            <p className="mt-5 max-w-(--w-col) text-base leading-relaxed text-muted-foreground">{t("entry.lede")}</p>
            <div className="mt-7 space-y-3" data-hydrated={hydrated ? "" : undefined}>
              <Button size="lg" asChild className="h-11 px-5"><Link href="/onboarding">{t(hydrated && draft ? "entry.resume" : "home.cta")}<ArrowRight aria-hidden /></Link></Button>
              <p className="text-xs leading-relaxed text-muted-foreground">{t(hydrated && draft ? "entry.draftNote" : "home.noAccount")}</p>
            </div>
            <p className="mt-6 max-w-(--w-col) text-xs leading-relaxed text-muted-foreground">{t("entry.setupNote")}</p>
          </div>
          <PathPreview />
        </section>
        <section className="grid gap-7 border-y py-7 sm:grid-cols-2 sm:gap-12">
          {([{ icon: Check, title: "entry.howTitle", body: "entry.howBody" }, { icon: HardDrive, title: "entry.privacyTitle", body: "entry.privacyBody" }] as const).map(({ icon: Icon, title, body }) => <div key={title} className="flex gap-3"><Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /><div><h2 className="text-sm font-medium">{t(title)}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(body)}</p></div></div>)}
        </section>
      </div>

      )}

      <footer className="mx-auto flex w-full max-w-(--w-content) items-center gap-5 px-6 py-6 text-xs text-muted-foreground">
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
