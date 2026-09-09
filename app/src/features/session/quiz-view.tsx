"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentQuiz } from "@/lib/schemas";
import { useT } from "@/lib/i18n";
import { judge, questionKey, resolveOption } from "@/lib/quiz";
import type { QuizDraft, QuizResults } from "@/lib/store/types";
import { Option, Question } from "./quiz-question";
import { useQuizDraft } from "./use-quiz-draft";
import { QuizStatus } from "./quiz-status";

/**
 * Each choice question is judged the moment it is answered, so the verdict is instant and a
 * streak of consecutive correct answers is visible while it lasts. Short answers are judged
 * on finish only. The final results go to the archive and, from there, to the profiler.
 */
export function QuizView({
  quiz,
  results,
  onSubmit,
  draft,
  onDraft,
}: {
  quiz: DocumentQuiz;
  results?: QuizResults;
  draft?: QuizDraft;
  onDraft?: (draft: QuizDraft) => void;
  onSubmit: (r: QuizResults) => void;
}) {
  const { sel, order, setSel, confirm: answer } = useQuizDraft(quiz, results, draft, onDraft);
  const [warn, setWarn] = useState(false);
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
  let n = 0;

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (answered < total) { setWarn(true); return; }
        onSubmit(judge(quiz, sel));
      }}
    >
      {!finished && <p className="text-xs text-muted-foreground">{t("polish.quizDraft")}</p>}
      <QuizStatus total={total} answered={answered} streak={streak} results={results} />

      {quiz.single_choice_questions.map((q, i) => {
        const key = questionKey("single", i);
        const want = resolveOption(q.options, q.correct_option);
        return (
          <Question key={key} n={++n} text={q.question} verdict={finished || verdicts[key] !== "unanswered" ? verdicts[key] : undefined} explanation={q.explanation}>
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
        const locked = finished || order.includes(key);
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
                onClick={() => answer(key)}
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
          <Question key={key} n={++n} text={q.question} verdict={finished || verdicts[key] !== "unanswered" ? verdicts[key] : undefined} explanation={q.explanation}>
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
              finished
                ? `${t("quiz.expected")} ${q.expected_answer}${q.explanation ? ` — ${q.explanation}` : ""}`
                : undefined
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

      {!finished && warn && answered < total && (
        <div role="alert" className="space-y-3 rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm">
          <p>{t("polish.missingAnswers", { n: total - answered })}</p>
          <Button type="button" variant="outline" onClick={() => onSubmit(judge(quiz, sel))}>{t("polish.submitPartial")}</Button>
        </div>
      )}
      {!finished && total > 0 && (
        <Button type="submit" data-testid="submit-quiz" disabled={answered === 0}>
          {t("quiz.finish")}
        </Button>
      )}
    </form>
  );
}
