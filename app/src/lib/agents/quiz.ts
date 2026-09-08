/** Document Quiz Generator. */
import type { z } from "zod";
import type { PromptValue } from "@/lib/prompts/format";
import { quizGeneratorSystem, quizGeneratorTask } from "@/lib/prompts/quiz-generator";
import { DocumentQuiz, type QuizCounts } from "@/lib/schemas";
import { runJSON } from "./run";

export function generateQuiz(input: { learner_profile: PromptValue; learning_document: PromptValue } & z.output<typeof QuizCounts>) {
  return runJSON({ tier: "fast", system: quizGeneratorSystem, task: quizGeneratorTask, vars: input }, DocumentQuiz);
}
