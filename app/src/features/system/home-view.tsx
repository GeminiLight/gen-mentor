"use client";

import { ArrowRight, Compass, Route, Sparkles } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { LangToggle } from "@/components/lang-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useT, type Key } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { LearningDesk } from "./learning-desk";
import { HealthBadge } from "./health-badge";

const steps: { icon: typeof Compass; title: Key; body: Key }[] = [
  { icon: Compass, title: "home.step1Title", body: "home.step1Body" },
  { icon: Route, title: "home.step2Title", body: "home.step2Body" },
  { icon: Sparkles, title: "home.step3Title", body: "home.step3Body" },
];

/** Returning learners see their goal and the next session before the fold; newcomers get the goal form. */
export function HomeView() {
  const { t } = useT();
  const { goals, hydrated } = useArchive();
  const goal = useActiveGoal();
  const returning = hydrated && goals.length > 0 && goal;
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-(--w-content) items-center justify-between px-6 py-5">
        <Logo width={168} className="h-auto w-28 sm:w-42" />
        <div className="flex items-center gap-2">
          <HealthBadge />
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      {returning ? <LearningDesk goal={goal} /> : (
      <section className="mx-auto flex w-full max-w-(--w-content) flex-1 flex-col justify-center px-6 py-16">
        <h1 className="max-w-2xl text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{t("home.title")}</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("home.lede")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3" data-hydrated={hydrated ? "" : undefined}>
          <Button size="lg" asChild className="h-11 px-5"><Link href="/onboarding">{t("home.cta")} <ArrowRight aria-hidden /></Link></Button>
          <span className="text-sm text-muted-foreground">{t("home.noAccount")}</span>
        </div>
        <ol className="mt-20 grid gap-x-10 gap-y-8 border-t pt-8 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4" aria-hidden />
                <span className="num text-xs">0{i + 1}</span>
              </div>
              <h2 className="mt-3 font-medium">{t(title)}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
            </li>
          ))}
        </ol>
      </section>

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
