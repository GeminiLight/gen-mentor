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
        "group relative flex gap-4 py-5 transition-colors sm:gap-6",
        isNext && "before:absolute before:inset-y-3 before:-left-4 before:w-0.5 before:rounded-full before:bg-brand sm:before:-left-6",
      )}
      data-testid="session-row"
      data-learned={learned || undefined}
    >
      <span
        className={cn(
          "num mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
          learned && "border-brand bg-brand text-brand-foreground",
          isNext && !learned && "border-brand text-brand",
          !learned && !isNext && "text-muted-foreground",
        )}
        aria-hidden
      >
        {learned ? <Check className="size-3.5" /> : index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className={cn("font-medium text-balance", learned && "text-muted-foreground")}>
            <Link
              href={href}
              className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50 group-hover:text-foreground"
              aria-label={`${session.title} · ${t(status.action)}`}
            >
              {session.title}
            </Link>
          </h2>
          {isNext && <span className="text-xs font-medium text-brand">{t("common.upNext")}</span>}
          {learned && minutes > 0 && <span className="num text-xs text-muted-foreground">{t("common.minutes", { n: minutes })}</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{session.abstract}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t(status.label)}{session.associated_skills.length ? ` · ${session.associated_skills.join(" · ")}` : ""}</p>
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
