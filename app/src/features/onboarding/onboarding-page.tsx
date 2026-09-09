"use client";

import Link from "next/link";
import { LangToggle } from "@/components/lang-toggle";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { useT } from "@/lib/i18n";
import { NoKeyBanner } from "@/features/settings/no-key-banner";
import { OnboardingFlow } from "./onboarding-flow";

export function OnboardingPage() {
  const { t } = useT();
  return (
    <main className="mx-auto w-full max-w-(--w-content) px-6 py-6">
      <NoKeyBanner />
      <header className="my-6 flex items-center justify-between">
        <Link href="/" className="text-sm" aria-label={t("common.appName")}>
          <Brand />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/goals" className="mr-2 text-sm text-muted-foreground hover:text-foreground">
            {t("onboarding.myGoals")}
          </Link>
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>
      <div className="mb-10 max-w-(--w-measure)">
        <p className="eyebrow mb-3">{t("polish.startSmall")}</p>
        <h1 className="text-xl font-semibold tracking-tight">{t("onboarding.title")}</h1>
      </div>
      <div className="rounded-xl border bg-card p-5 sm:p-8"><OnboardingFlow /></div>
    </main>
  );
}
