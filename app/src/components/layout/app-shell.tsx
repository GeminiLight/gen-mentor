"use client";

import { ProfileRefreshNotice } from "@/features/session/profile-refresh-notice";
import { Settings2, HardDrive } from "lucide-react";
import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { ModelSettings } from "@/features/settings/model-settings";
import { NoKeyBanner } from "@/features/settings/no-key-banner";
import { TutorTrigger } from "@/features/tutor/tutor-trigger";
import { useTutorPanel } from "@/features/tutor/use-tutor-panel";
import { TutorSheet } from "@/features/tutor/tutor-sheet";
import { useT } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { sessionUid } from "@/lib/store/derive";
import { cn } from "@/lib/utils";
import { GoalSwitcher } from "./goal-switcher";
import { CommandTrigger } from "./command-trigger";
import { CommandMenu } from "./command-menu";
import { NAV } from "./nav";

/** Desktop: a fixed rail. Phones: a top bar plus a bottom tab bar. Content is one column. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  const { t } = useT();
  const items = NAV.filter((n) => !n.needsGoal || goal);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === "/learning-path" && pathname.startsWith("/session/"));

  // On a session page the tutor reads the open document and its suggestions name that session.
  const sessionIndex = /^\/session\/(\d+)/.exec(pathname)?.[1];
  const session = goal && sessionIndex !== undefined ? goal.learning_path[Number(sessionIndex)] : undefined;
  const context = goal && sessionIndex !== undefined ? goal.sessions[sessionUid(goal.id, Number(sessionIndex))]?.document?.markdown : undefined;
  const panel = useTutorPanel();
  const [commandOpen, setCommandOpen] = useState(false);
  const tutor = (variant: "icon" | "rail") => (goal ? <TutorTrigger panel={panel} variant={variant} /> : null);

  return (
    <div className="flex min-h-full flex-1">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-3 focus:ring-ring/50">
        {t("common.skipToContent")}
      </a>
      <aside className="sticky top-0 hidden h-dvh w-(--w-rail) shrink-0 flex-col overflow-y-auto overscroll-contain border-r bg-sidebar px-4 py-6 md:flex">
        <Link href="/" className="px-2 py-1 text-base" aria-label={t("common.appName")}>
          <Brand />
        </Link>
        <div className="mt-6"><CommandTrigger onOpen={() => setCommandOpen(true)} /></div>
        {goal && <GoalSwitcher goal={goal} />}
        <LayoutGroup id="desktop-navigation"><nav className="rail-nav mt-7 flex flex-col gap-1" aria-label={t("polish.navigation")}>
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "group relative isolate flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
                isActive(href) && "font-medium text-foreground",
              )}
            >
              {isActive(href) && <motion.span layoutId="navigation-active" className="nav-active" transition={{ duration: reduce ? 0 : 0.18, ease: [0.2, 0, 0, 1] }} aria-hidden />}
              <Icon className={cn("size-4", isActive(href) && "text-brand")} strokeWidth={1.6} aria-hidden />
              {t(label)}
            </Link>
          ))}
        </nav></LayoutGroup>
        <div className="mt-auto flex flex-col gap-1 pt-8">
          {tutor("rail")}
          <p className="mt-3 flex items-center gap-2 px-3 text-xs leading-relaxed text-muted-foreground"><HardDrive className="size-3.5 shrink-0" aria-hidden />{t("polish.localArchive")}</p>
          <div className="mt-2 flex items-center gap-0.5 border-t pt-3">
            <ModelSettings />
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <NoKeyBanner />
        <header className="flex h-12 items-center justify-between border-b px-4 md:hidden">
          <Link href="/" className="text-sm" aria-label={t("common.appName")}>
            <Brand />
          </Link>
          <div className="flex items-center">
            <CommandTrigger compact onOpen={() => setCommandOpen(true)} />
            {tutor("icon")}
            <ModelSettings />
            <details className="relative">
              <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md hover:bg-muted" aria-label={t("polish.readingTools")}><Settings2 className="size-4" aria-hidden /></summary>
              <div className="absolute right-0 z-40 mt-2 flex gap-2 rounded-lg border bg-popover p-3 shadow-sm"><LangToggle /><ThemeToggle /></div>
            </details>
          </div>
        </header>
        {goal && <GoalSwitcher goal={goal} compact />}
        <main id="main" className="@container/workspace mx-auto w-full max-w-(--w-content) flex-1 px-4 py-6 pb-24 md:px-8 md:py-10 md:pb-10" data-hydrated={hydrated ? "" : undefined}>
          {goal && <ProfileRefreshNotice goal={goal} />}
          <div key={pathname} className="workspace-route">{children}</div>
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t pb-[env(safe-area-inset-bottom)] bg-background/95 backdrop-blur md:hidden" aria-label={t("polish.navigation")}>
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn("relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground", isActive(href) && "font-medium text-foreground")}
            >
              {isActive(href) && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" aria-hidden />}
              <Icon className={cn("size-5", isActive(href) && "text-brand")} strokeWidth={1.6} aria-hidden />
              {t(label)}
            </Link>
          ))}
        </nav>
      </div>
      <CommandMenu open={commandOpen} setOpen={setCommandOpen} />
      {goal && <TutorSheet key={goal.id} goal={goal} session={session} context={context} panel={panel} />}
    </div>
  );
}
