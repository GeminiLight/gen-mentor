"use client";

import { Flame } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentQuiz } from "@/lib/schemas";
import { useT } from "@/lib/i18n";
import { emptySelections, judge, questionKey, resolveOption, type Selections } from "@/lib/quiz";
import type { QuizResults } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { Option, Question } from "./quiz-question";

/**
 * Each choice question is judged the moment it is answered, so the verdict is instant and a
 * streak of consecutive correct answers is visible while it lasts. Short answers are judged
 * on finish only. The final results go to the archive and, from there, to the profiler.
 */
export function QuizView({
  quiz,
  results,
  onSubmit,
}: {
  quiz: DocumentQuiz;
  results?: QuizResults;
  onSubmit: (r: QuizResults) => void;
}) {
  const [sel, setSel] = useState<Selections>(() => emptySelections(quiz));
  const [order, setOrder] = useState<string[]>([]);
  const { t } = useT();
  const finished = !!results;
  // Live verdicts for what has been answered so far; the stored results win once finished.
  const live = useMemo(() => judge(quiz, sel), [quiz, sel]);
  const verdicts = results?.verdicts ?? live.verdicts;
  const judged = (key: string) => finished || (verdicts[key] !== undefined && verdicts[key] !== "unanswered");
  const streak = useMemo(() => {
    let run = 0;
    for (const key of [...order].reverse()) {
      if (verdicts[key] === "correct") run += 1;
      else break;
    }
    return run;
  }, [order, verdicts]);
  const answered = Object.values(live.verdicts).filter((v) => v !== "unanswered").length;
  const total =
    quiz.single_choice_questions.length +
    quiz.multiple_choice_questions.length +
    quiz.true_false_questions.length +
    quiz.short_answer_questions.length;
  const answer = (key: string, next: Selections) => {
    setSel(next);
    setOrder((o) => (o.includes(key) ? o : [...o, key]));
  };
  let n = 0;

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(judge(quiz, sel));
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2 text-sm"
        aria-live="polite"
      >
        <span className="num text-muted-foreground">
          {t("quiz.answered", { n: answered, total })}
        </span>
        <span
          className={cn(
            "num inline-flex items-center gap-1.5 font-medium transition-colors",
            streak >= 2 ? "text-brand" : "text-muted-foreground",
          )}
          data-testid="streak"
        >
          <Flame className={cn("size-4", streak >= 2 && "fill-current")} aria-hidden />
          {streak >= 2 ? t("quiz.inARow", { n: streak }) : t("quiz.streak")}
        </span>
      </div>

      {quiz.single_choice_questions.map((q, i) => {
        const key = questionKey("single", i);
        const want = resolveOption(q.options, q.correct_option);
        return (
          <Question key={key} n={++n} text={q.question} verdict={verdicts[key]} explanation={q.explanation}>
            {q.options.map((opt, k) => (
              <Option
                key={k}
                name={key}
                type="radio"
                checked={sel.single[i] === k}
                judged={judged(key)}
                correct={want === null ? null : k === want}
                onChange={() => answer(key, { ...sel, single: sel.single.map((x, j) => (j === i ? k : x)) })}
              >
                {opt}
              </Option>
            ))}
          </Question>
        );
      })}

      {quiz.multiple_choice_questions.map((q, i) => {
        const key = questionKey("multiple", i);
        const want = q.correct_options.map((c) => resolveOption(q.options, c));
        const locked = finished || verdicts[key] === "correct" || verdicts[key] === "incorrect";
        return (
          <Question
            key={key}
            n={++n}
            text={q.question}
            hint={t("quiz.selectAll")}
            verdict={locked ? verdicts[key] : undefined}
            explanation={q.explanation}
          >
            {q.options.map((opt, k) => (
              <Option
                key={k}
                name={`${key}-${k}`}
                type="checkbox"
                checked={sel.multiple[i]?.includes(k) ?? false}
                judged={locked}
                correct={want.includes(k)}
                onChange={() =>
                  setSel({
                    ...sel,
                    multiple: sel.multiple.map((x, j) =>
                      j === i ? (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]) : x,
                    ),
                  })
                }
              >
                {opt}
              </Option>
            ))}
            {!locked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={(sel.multiple[i]?.length ?? 0) === 0}
                onClick={() => setOrder((o) => (o.includes(key) ? o : [...o, key]))}
              >
                {t("quiz.confirm")}
              </Button>
            )}
          </Question>
        );
      })}

      {quiz.true_false_questions.map((q, i) => {
        const key = questionKey("tf", i);
        return (
          <Question key={key} n={++n} text={q.question} verdict={verdicts[key]} explanation={q.explanation}>
            <div className="flex gap-3">
              {[true, false].map((val) => (
                <Option
                  key={String(val)}
                  name={key}
                  type="radio"
                  checked={sel.tf[i] === val}
                  judged={judged(key)}
                  correct={val === q.correct_answer}
                  onChange={() => answer(key, { ...sel, tf: sel.tf.map((x, j) => (j === i ? val : x)) })}
                >
                  {val ? t("quiz.true") : t("quiz.false")}
                </Option>
              ))}
            </div>
          </Question>
        );
      })}

      {quiz.short_answer_questions.map((q, i) => {
        const key = questionKey("short", i);
        return (
          <Question
            key={key}
            n={++n}
            text={q.question}
            verdict={finished ? verdicts[key] : undefined}
            explanation={
              finished ? `${t("quiz.expected")} ${q.expected_answer}${q.explanation ? ` — ${q.explanation}` : ""}` : undefined
            }
          >
            <Textarea
              rows={3}
              value={sel.short[i] ?? ""}
              disabled={finished}
              onChange={(e) => setSel({ ...sel, short: sel.short.map((x, j) => (j === i ? e.target.value : x)) })}
              aria-label={t("quiz.answerTo", { n })}
            />
          </Question>
        );
      })}

      {!finished ? (
        <Button type="submit" data-testid="submit-quiz" disabled={answered === 0}>
          {t("quiz.finish")}
        </Button>
      ) : (
        <p className="num text-sm" data-testid="quiz-score">
          {t("quiz.score", { correct: results.correct, answered: results.answered })}
        </p>
      )}
    </form>
  );
}
