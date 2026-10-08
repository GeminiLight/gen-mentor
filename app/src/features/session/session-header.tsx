"use client";

import { ArrowLeft, Clock3, ChevronDown, Target } from "lucide-react";
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
      <p className="eyebrow mt-6 flex flex-wrap items-center gap-2 text-brand">
        {session.id}
        {readingMinutes ? <span className="num ml-2 inline-flex items-center gap-1.5 normal-case tracking-normal text-muted-foreground"><Clock3 className="size-3.5" aria-hidden />{t("session.readingTime", { n: readingMinutes })}</span> : null}
      </p>
      <h1 className="display mt-3 max-w-(--w-measure) text-xl">{session.title}</h1>

      <p className="mt-3 max-w-(--w-measure) text-sm leading-relaxed text-muted-foreground">{session.abstract}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {session.associated_skills.map((s) => (
          <Badge key={s} variant="secondary">
            {s}
          </Badge>
        ))}
        {session.if_learned && <Badge className="bg-success-soft text-success">{t("common.learned")}</Badge>}
      </div>
      {!!session.desired_outcome_when_completed.length && <details className="group mt-5 max-w-(--w-measure) rounded-lg border bg-card px-4">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 list-none text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"><Target className="size-4 text-brand" aria-hidden />{t("journey.outcome")}<ChevronDown aria-hidden className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" /></summary>
        <div className="pb-4"><LessonOutcomes session={session} /></div>
      </details>}
    </div>
  );
}
