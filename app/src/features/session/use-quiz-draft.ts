"use client";

import { useState } from "react";
import { emptySelections, type Selections } from "@/lib/quiz";
import type { DocumentQuiz } from "@/lib/schemas";
import type { QuizDraft, QuizResults } from "@/lib/store/types";

/** Persist on the interaction, so leaving a tab cannot lose the last keystroke. */
export function useQuizDraft(quiz: DocumentQuiz, results: QuizResults | undefined, draft: QuizDraft | undefined, onDraft?: (draft: QuizDraft) => void) {
  const [sel, updateSel] = useState<Selections>(() => results?.selections ?? draft?.selections ?? emptySelections(quiz));
  const [order, updateOrder] = useState<string[]>(() => draft?.order ?? []);
  const save = (selections: Selections, sequence: string[]) => {
    updateSel(selections);
    updateOrder(sequence);
    onDraft?.({ selections, order: sequence });
  };
  return {
    sel, order,
    setSel: (selections: Selections) => save(selections, order),
    confirm: (key: string, selections = sel) => save(selections, order.includes(key) ? order : [...order, key]),
  };
}
