"use client";

import { ArrowRight, Compass, Route, Sparkles } from "lucide-react";
import Link from "next/link";
import { LangToggle } from "@/components/lang-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useT, type Key } from "@/lib/i18n";
import { ContinueLink } from "./continue-link";
import { HealthBadge } from "./health-badge";

const steps: { icon: typeof Compass; title: Key; body: Key }[] = [
  { icon: Compass, title: "home.step1Title", body: "home.step1Body" },
  { icon: Route, title: "home.step2Title", body: "home.step2Body" },
  { icon: Sparkles, title: "home.step3Title", body: "home.step3Body" },
];

export function HomeView() {
  const { t } = useT();
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-semibold tracking-tight">{t("common.appName")}</span>
        <div className="flex items-center gap-2">
          <HealthBadge />
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        {t("home.eyebrow") && <p className="text-sm font-medium text-muted-foreground">{t("home.eyebrow")}</p>}
        <h1 className="mt-3 max-w-2xl text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{t("home.title")}</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("home.lede")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link
            href="/onboarding"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("home.cta")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <span className="text-sm text-muted-foreground">{t("home.noAccount")}</span>
        </div>
        <div className="mt-4 min-h-6">
          <ContinueLink />
        </div>

        <ol className="mt-20 grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h2 className="mt-4 font-medium">{t(title)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
