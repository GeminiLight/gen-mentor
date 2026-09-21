"use client";

import { questionKey, type Selections, type Verdict } from "@/lib/quiz";
import type { DocumentQuiz } from "@/lib/schemas";
import { Question } from "./quiz-question";
import { OrderingExercise } from "./ordering-exercise";
import { ConfigurationExercise } from "./configuration-exercise";

export function HandsOnQuestions({ quiz, sel, start, finished, verdicts, setSel, confirm }: {
  quiz: DocumentQuiz; sel: Selections; start: number; finished: boolean; verdicts: Record<string, Verdict>;
  setSel: (sel: Selections) => void; confirm: (key: string, sel: Selections) => void;
}) {
  const ordering = quiz.ordering_questions ?? [], configuration = quiz.configuration_questions ?? [];
  return <>
    {ordering.map((q, i) => {
      const key = questionKey("ordering", i), answer = sel.ordering![i];
      const locked = finished || answer.confirmed;
      const selections = (value: typeof answer) => ({ ...sel, ordering: sel.ordering!.map((a, index) => index === i ? value : a) });
      return <Question key={key} n={start + i + 1} text={q.question} verdict={locked ? verdicts[key] : undefined} explanation={q.explanation}>
        <OrderingExercise items={q.items} answer={answer} locked={locked} expected={locked ? q.correct_order : undefined}
          onChange={(value) => setSel(selections(value))} onConfirm={() => confirm(key, selections({ ...answer, confirmed: true }))} />
      </Question>;
    })}
    {configuration.map((q, i) => {
      const key = questionKey("configuration", i), answer = sel.configuration![i], n = start + ordering.length + i + 1;
      const locked = finished || answer.confirmed;
      const selections = (value: typeof answer) => ({ ...sel, configuration: sel.configuration!.map((a, index) => index === i ? value : a) });
      return <Question key={key} n={n} text={q.question} verdict={locked ? verdicts[key] : undefined} explanation={q.explanation}>
        <ConfigurationExercise n={n} answer={answer} locked={locked} expected={locked ? q.correct_configurations : undefined}
          onChange={(value) => setSel(selections(value))} onConfirm={() => confirm(key, selections({ ...answer, confirmed: true }))} />
      </Question>;
    })}
  </>;
}
