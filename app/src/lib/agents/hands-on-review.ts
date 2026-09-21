import { z } from "zod";
import type { DocumentQuiz } from "@/lib/schemas";
import type { PromptValue } from "@/lib/prompts/format";
import { handsOnReviewSystem, handsOnReviewTask } from "@/lib/prompts/hands-on-review";
import { runJSON } from "./run";

const Review = z.object({ ordering_approved: z.boolean(), configuration_approved: z.boolean(), reason: z.string().min(1) });

/** Only approved tasks reach a learner; review never invents a replacement answer key. */
export async function reviewHandsOn(quiz: DocumentQuiz, learning_document: PromptValue): Promise<DocumentQuiz> {
  if (!quiz.ordering_questions?.length && !quiz.configuration_questions?.length) return quiz;
  const review = await runJSON({ tier: "smart", system: handsOnReviewSystem, task: handsOnReviewTask,
    vars: { learning_document, ordering_questions: quiz.ordering_questions ?? [], configuration_questions: quiz.configuration_questions ?? [] },
  }, Review);
  return { ...quiz, ordering_questions: review.ordering_approved ? quiz.ordering_questions : [],
    configuration_questions: review.configuration_approved ? quiz.configuration_questions : [] };
}
