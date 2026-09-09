"use client";

import { Flame } from "lucide-react";
import { useT } from "@/lib/i18n";
import { scoredCount } from "@/lib/quiz";
import type { QuizResults } from "@/lib/store/types";
import { cn } from "@/lib/utils";

/** The bar above the questions: empty quiz, final score, or live progress with the streak. */
export function QuizStatus({ total, answered, streak, results }: { total: number; answered: number; streak: number; results?: QuizResults }) {
  const { t, fmtDate } = useT();
  if (total === 0) return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("quiz.none")}</p>;
  if (results) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2 text-sm" data-testid="quiz-score">
        <div className="space-y-1">
          <p className="num font-medium">{scoredCount(results) > 0 ? t("polish.scored", { correct: results.correct, scored: scoredCount(results) }) : t("polish.pendingReview", { n: results.answered })}</p>
          <p className="text-xs text-muted-foreground">{t("polish.coverage", { answered: results.answered, total })}{results.answered > scoredCount(results) && scoredCount(results) > 0 ? ` · ${t("polish.pendingReview", { n: results.answered - scoredCount(results) })}` : ""}</p>
        </div>
        <span className="num text-muted-foreground">{fmtDate(results.submittedAt, { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2 text-sm" aria-live="polite">
      <span className="num text-muted-foreground">{t("quiz.answered", { n: answered, total })}</span>
      <span className={cn("num inline-flex items-center gap-1.5 font-medium transition-colors", streak >= 2 ? "text-brand" : "text-muted-foreground")} data-testid="streak">
        <Flame className={cn("size-4", streak >= 2 && "fill-current")} aria-hidden />
        {streak >= 2 ? t("quiz.inARow", { n: streak }) : t("quiz.streak")}
      </span>
    </div>
  );
}
