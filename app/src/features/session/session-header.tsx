"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LessonOutcomes } from "./lesson-outcomes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionItem } from "@/lib/schemas";
import { useT } from "@/lib/i18n";

export function SessionHeader({ session, readingMinutes }: { session: SessionItem; readingMinutes?: number }) {
  const { t } = useT();
  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/learning-path">
          <ArrowLeft aria-hidden /> {t("session.path")}
        </Link>
      </Button>
      <p className="eyebrow mt-4">
        {session.id}
        {readingMinutes ? <span className="num ml-3 normal-case tracking-normal">{t("session.readingTime", { n: readingMinutes })}</span> : null}
      </p>
      <h1 className="mt-2 max-w-(--w-measure) text-xl font-semibold tracking-tight">{session.title}</h1>

      <p className="mt-3 max-w-(--w-measure) text-sm leading-relaxed text-muted-foreground">{session.abstract}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {session.associated_skills.map((s) => (
          <Badge key={s} variant="secondary">
            {s}
          </Badge>
        ))}
        {session.if_learned && <Badge className="bg-success-soft text-success">{t("common.learned")}</Badge>}
      </div>
      {!!session.desired_outcome_when_completed.length && <details className="group mt-4 max-w-(--w-measure) border-t border-b">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium marker:text-muted-foreground">{t("journey.outcome")}<span aria-hidden className="ml-auto text-muted-foreground transition-transform group-open:rotate-45">+</span></summary>
        <div className="pb-4"><LessonOutcomes session={session} /></div>
      </details>}
    </div>
  );
}
