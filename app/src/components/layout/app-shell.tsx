"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { ModelSettings } from "@/features/settings/model-settings";
import { TutorSheet } from "@/features/tutor/tutor-sheet";
import { useT } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CommandMenu } from "./command-menu";
import { NAV } from "./nav";

/** Desktop: a fixed rail. Phones: a top bar plus a bottom tab bar. Content is one column. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  const { t } = useT();
  const items = NAV.filter((n) => !n.needsGoal || goal);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === "/learning-path" && pathname.startsWith("/session/"));

  return (
    <div className="flex min-h-full flex-1">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-3 focus:ring-ring/50">
        {t("common.skipToContent")}
      </a>
      <aside className="sticky top-0 hidden h-dvh w-(--w-rail) shrink-0 flex-col border-r bg-sidebar px-3 py-4 md:flex">
        <Link href="/" className="px-2 text-sm" aria-label={t("common.appName")}>
          <Brand />
        </Link>
        {goal && (
          <Link href="/goals" className="mt-4 block truncate rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground" title={goal.learning_goal}>
            {goal.learning_goal}
          </Link>
        )}
        <nav className="mt-6 flex flex-col gap-0.5" aria-label="Primary">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                isActive(href) && "bg-sidebar-accent font-medium text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t(label)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 px-1">
          <CommandMenu />
          <div className="flex items-center justify-between">
            {goal ? <TutorSheet goal={goal} /> : <span />}
            <div className="flex items-center">
              <ModelSettings />
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b px-4 md:hidden">
          <Link href="/" className="text-sm" aria-label={t("common.appName")}>
            <Brand />
          </Link>
          <div className="flex items-center">
            <CommandMenu compact />
            {goal && <TutorSheet goal={goal} />}
            <ModelSettings />
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-(--w-content) flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8" data-hydrated={hydrated ? "" : undefined}>
          {children}
        </main>
        <nav className="fixed inset-x-0 bottom-0 flex border-t bg-background/95 backdrop-blur md:hidden" aria-label="Primary">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn("flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground", isActive(href) && "text-foreground")}
            >
              <Icon className="size-5" aria-hidden />
              {t(label)}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
