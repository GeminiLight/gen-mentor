"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionItem } from "@/lib/schemas";
import { useT, type Key } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SessionRow({ session, index, isNext, minutes }: { session: SessionItem; index: number; isNext: boolean; minutes: number }) {
  const learned = session.if_learned;
  const { t } = useT();
  return (
    <li className={cn("flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:gap-4", isNext && "border-brand/60 bg-brand-soft/30", learned && "bg-muted/40")} data-testid="session-row" data-learned={learned || undefined}>
      <span className={cn("num flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium", learned && "border-brand bg-brand text-brand-foreground", isNext && !learned && "border-brand text-brand")} aria-hidden>
        {learned ? <Check className="size-4" /> : index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium text-balance">{session.title}</h2>
          {isNext && <Badge>{t("common.upNext")}</Badge>}
          {learned && minutes > 0 && <span className="num text-xs text-muted-foreground">{t("common.minutes", { n: minutes })}</span>}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{session.abstract}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {session.desired_outcome_when_completed.map((o) => (
            <Badge key={o.name} variant="outline" className="font-normal">
              {o.name} → {t(`levels.${o.level}` as Key)}
            </Badge>
          ))}
        </div>
      </div>
      <Button size="sm" variant={isNext ? "default" : "outline"} asChild className="self-end sm:self-center">
        <Link href={`/session/${index}`}>
          {learned ? t("path.review") : t("path.learn")} <ArrowRight data-icon="inline-end" aria-hidden />
        </Link>
      </Button>
    </li>
  );
}
