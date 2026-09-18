"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocumentQuiz } from "@/lib/schemas";
import type { PracticeState, QuizDraft, QuizResults } from "@/lib/store/types";
import { useT } from "@/lib/i18n";
import { scoredCount } from "@/lib/quiz";
import { reviewQuiz } from "@/lib/quiz-review";
import { QuizView } from "./quiz-view";

export function QuizWorkspace({ quiz, results, draft, onDraft, onSubmit, practice, onPractice }: {
  quiz: DocumentQuiz; results?: QuizResults; draft?: QuizDraft;
  onDraft: (draft: QuizDraft) => void; onSubmit: (results: QuizResults) => void;
  practice?: PracticeState; onPractice: (practice: PracticeState) => void;
}) {
  const { t } = useT();
  const [active, setActive] = useState(() => typeof window !== "undefined" && window.location.hash === "#practice");
  const review = results ? reviewQuiz(quiz, results) : null;
  const count = review ? Object.keys(review.keys).length : 0;
  const saved = practice?.sourceSubmittedAt === results?.submittedAt ? practice : undefined;
  useEffect(() => {
    if (!active || !count) return;
    const frame = requestAnimationFrame(() => document.getElementById("practice")?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [active, count]);
  const changeMode = (value: boolean) => {
    setActive(value);
    requestAnimationFrame(() => document.getElementById(value ? "practice-title" : "first-attempt-title")?.focus({ preventScroll: false }));
    window.history.replaceState(window.history.state, "", value ? "#practice" : "#quiz");
  };
  if (!active || !results || !review || !count) return <div className="space-y-6">
    {results && <h2 id="first-attempt-title" tabIndex={-1} className="scroll-mt-40 text-sm font-medium">{t("coach.firstAttempt")}</h2>}
    {results && count > 0 && <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
      <div className="min-w-0 flex-1"><h2 className="font-medium">{t("coach.reviewCount", { n: count })}</h2><p className="mt-1 text-sm text-muted-foreground">{t("coach.reviewBody")}</p></div>
      <Button variant="outline" onClick={() => changeMode(true)}><RotateCcw aria-hidden />{t("coach.reviewAction")}</Button>
    </div>}
    <QuizView key={results?.submittedAt ?? "fresh"} quiz={quiz} results={results} draft={draft} onDraft={onDraft} onSubmit={onSubmit} />
  </div>;
  const remaining = Object.values(saved?.results?.verdicts ?? {}).filter((v) => v === "incorrect" || v === "unanswered").length;
  return <section id="practice" className="space-y-6 scroll-mt-40" aria-label={t("coach.practiceTitle")}>
    <div className="space-y-3 border-b pb-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => changeMode(false)}><ArrowLeft aria-hidden />{t("coach.original")}</Button>
      <h2 id="practice-title" tabIndex={-1} className="scroll-mt-40 text-lg font-semibold">{t("coach.practiceTitle")}</h2>
      <p className="max-w-(--w-measure) text-sm leading-relaxed text-muted-foreground">{t("coach.practiceNote")}</p>
    </div>
    <QuizView key={saved?.results?.submittedAt ?? "practice"} quiz={review.quiz} results={saved?.results} draft={saved?.draft}
      onDraft={(draft) => onPractice({ sourceSubmittedAt: results.submittedAt, draft })}
      onSubmit={(result) => onPractice({ sourceSubmittedAt: results.submittedAt, results: result })} />
    {saved?.results && <div className="space-y-3 border-t pt-5">
      <p role="status" className="text-sm"><span className="font-medium">{t("coach.practiceSaved")}</span><span className="mt-1 block text-muted-foreground">{t(remaining ? "coach.remaining" : scoredCount(saved.results) ? "coach.allReviewed" : "coach.practicePending", { n: remaining })}</span></p>
      {review.quiz.short_answer_questions.length > 0 && <p className="text-sm text-muted-foreground">{t("coach.practicePending")}</p>}
      <Button variant="outline" onClick={() => onPractice({ sourceSubmittedAt: results.submittedAt })}><RotateCcw aria-hidden />{t("coach.practiseAgain")}</Button>
    </div>}
  </section>;
}
