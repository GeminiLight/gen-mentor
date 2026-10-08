"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { SessionItem } from "@/lib/schemas";
import type { SessionState } from "@/lib/store";
import { lessonState } from "./lesson-state";
import { cn } from "@/lib/utils";

/**
 * One line in the path: number, title, a short abstract, the skills it moves. The next one is marked.
 * The title is the link and it stretches over the whole row, so a phone tap anywhere opens the
 * session; the button is a second, visible affordance that shows on hover and for the next session.
 */
export function SessionRow({ session, index, isNext, minutes, state }: { session: SessionItem; index: number; isNext: boolean; minutes: number; state?: SessionState }) {
  const learned = session.if_learned;
  const { t } = useT();
  const status = lessonState(learned, state);
  const href = `/session/${index}${status.quiz ? "#quiz" : ""}`;
  return (
    <li
      className={cn(
        "group relative flex gap-4 border-b py-5 pr-2 pl-3 transition-colors last:border-b-0 hover:bg-card sm:gap-6 sm:pl-4",
        isNext && "bg-card shadow-[inset_2px_0_0_var(--primary)]",
      )}
      data-testid="session-row"
      data-learned={learned || undefined}
    >
      <span className={cn("chapter-num relative flex w-8 shrink-0 items-start gap-1 text-lg leading-6", isNext && "text-brand")} aria-hidden>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className={cn("font-medium text-balance", learned && "text-muted-foreground")}>
            {learned && <Check className="mr-1.5 inline size-4 -translate-y-px text-brand" aria-hidden />}
            <Link
              href={href}
              className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50 group-hover:text-foreground"
              aria-label={`${session.title} · ${t(status.action)}`}
            >
              {session.title}
            </Link>
          </h2>
          {isNext && <span className="eyebrow text-brand">{t("common.upNext")}</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{session.abstract}</p>
        <p className="num mt-2 text-xs text-muted-foreground">{[t(status.label), learned && minutes > 0 ? t("common.minutes", { n: minutes }) : null, ...session.associated_skills].filter(Boolean).join(" · ")}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        asChild
        className={cn("relative hidden shrink-0 self-start text-muted-foreground @3xl/workspace:inline-flex", !isNext && "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100")}
      >
        <Link href={href} tabIndex={-1} aria-hidden>
          {t(status.action)} <ArrowRight data-icon="inline-end" aria-hidden />
        </Link>
      </Button>
    </li>
  );
}
