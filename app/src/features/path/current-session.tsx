"use client";

import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { Goal } from "@/lib/store";

export function CurrentSession({ goal, index }: { goal: Goal; index: number }) {
  const { t } = useT();
  const session = goal.learning_path[index];
  if (!session) return null;
  return (
    <section className="my-8 rounded-xl border bg-card p-5 sm:p-7" aria-label={t("polish.currentSession")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><BookOpen className="size-4" aria-hidden />{t("polish.lessonNumber", { n: index + 1, total: goal.learning_path.length })}</div>
      <div className="mt-4 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0 max-w-(--w-measure)">
          <h2 className="text-lg font-semibold leading-snug text-balance sm:text-xl">{session.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{session.abstract}</p>
        </div>
        <Button size="lg" asChild className="h-11 px-5"><Link href={`/session/${index}`}>{t("polish.readNow")}<ArrowRight aria-hidden /></Link></Button>
      </div>
    </section>
  );
}
