"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentQuiz } from "@/lib/schemas";
import { emptySelections, judge, questionKey, type Selections, type Verdict } from "@/lib/quiz";
import type { QuizResults } from "@/lib/store/types";
import { cn } from "@/lib/utils";

function VerdictMark({ v }: { v: Verdict | undefined }) {
  if (!v || v === "answered") return null;
  return (
    <span className={cn("ml-2 inline-flex items-center gap-1 text-xs font-medium", v === "correct" ? "text-success" : v === "incorrect" ? "text-destructive" : "text-muted-foreground")}>
      {v === "correct" ? <Check className="size-3.5" aria-hidden /> : v === "incorrect" ? <X className="size-3.5" aria-hidden /> : null}
      {v === "correct" ? "Correct" : v === "incorrect" ? "Incorrect" : "Not answered"}
    </span>
  );
}

/** Radio / checkbox / true-false / short-answer questions with instant verdicts on submit. */
export function QuizView({ quiz, results, onSubmit }: { quiz: DocumentQuiz; results?: QuizResults; onSubmit: (r: QuizResults) => void }) {
  const [sel, setSel] = useState<Selections>(() => emptySelections(quiz));
  const submitted = !!results;
  const v = results?.verdicts ?? {};
  let n = 0;

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(judge(quiz, sel));
      }}
    >
      {quiz.single_choice_questions.map((q, i) => (
        <fieldset key={`s${i}`} disabled={submitted} className="space-y-3">
          <legend className="font-medium">
            <span className="num text-muted-foreground">{++n}.</span> {q.question}
            <VerdictMark v={v[questionKey("single", i)]} />
          </legend>
          {q.options.map((opt, k) => (
            <Label key={k} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm font-normal has-checked:border-brand has-checked:bg-brand-soft/40">
              <input type="radio" name={`single-${i}`} className="accent-brand" checked={sel.single[i] === k} onChange={() => setSel({ ...sel, single: sel.single.map((x, j) => (j === i ? k : x)) })} />
              {opt}
            </Label>
          ))}
          {submitted && q.explanation && <p className="text-sm text-muted-foreground">{q.explanation}</p>}
        </fieldset>
      ))}

      {quiz.multiple_choice_questions.map((q, i) => (
        <fieldset key={`m${i}`} disabled={submitted} className="space-y-3">
          <legend className="font-medium">
            <span className="num text-muted-foreground">{++n}.</span> {q.question} <span className="text-xs text-muted-foreground">(select all that apply)</span>
            <VerdictMark v={v[questionKey("multiple", i)]} />
          </legend>
          {q.options.map((opt, k) => (
            <Label key={k} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm font-normal has-checked:border-brand has-checked:bg-brand-soft/40">
              <input
                type="checkbox"
                className="accent-brand"
                checked={sel.multiple[i]?.includes(k) ?? false}
                onChange={(e) => setSel({ ...sel, multiple: sel.multiple.map((x, j) => (j === i ? (e.target.checked ? [...x, k] : x.filter((y) => y !== k)) : x)) })}
              />
              {opt}
            </Label>
          ))}
          {submitted && q.explanation && <p className="text-sm text-muted-foreground">{q.explanation}</p>}
        </fieldset>
      ))}

      {quiz.true_false_questions.map((q, i) => (
        <fieldset key={`t${i}`} disabled={submitted} className="space-y-3">
          <legend className="font-medium">
            <span className="num text-muted-foreground">{++n}.</span> {q.question}
            <VerdictMark v={v[questionKey("tf", i)]} />
          </legend>
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <Label key={String(val)} className="flex flex-1 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm font-normal has-checked:border-brand has-checked:bg-brand-soft/40">
                <input type="radio" name={`tf-${i}`} className="accent-brand" checked={sel.tf[i] === val} onChange={() => setSel({ ...sel, tf: sel.tf.map((x, j) => (j === i ? val : x)) })} />
                {val ? "True" : "False"}
              </Label>
            ))}
          </div>
          {submitted && q.explanation && <p className="text-sm text-muted-foreground">{q.explanation}</p>}
        </fieldset>
      ))}

      {quiz.short_answer_questions.map((q, i) => (
        <fieldset key={`a${i}`} disabled={submitted} className="space-y-3">
          <legend className="font-medium">
            <span className="num text-muted-foreground">{++n}.</span> {q.question}
          </legend>
          <Textarea rows={3} value={sel.short[i] ?? ""} onChange={(e) => setSel({ ...sel, short: sel.short.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`Answer to question ${n}`} />
          {submitted && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Expected:</span> {q.expected_answer}
              {q.explanation ? ` — ${q.explanation}` : ""}
            </p>
          )}
        </fieldset>
      ))}

      {!submitted ? (
        <Button type="submit" data-testid="submit-quiz">
          Check answers
        </Button>
      ) : (
        <p className="num text-sm" data-testid="quiz-score">
          <span className="font-medium">{results.correct}</span> of {results.answered} answered correctly
          {results.answered === 0 ? " (nothing was answered)" : ""}
        </p>
      )}
    </form>
  );
}
