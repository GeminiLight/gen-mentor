/** Document Quiz Generator. */
import { configurationObject } from "@/lib/configuration";
import type { z } from "zod";
import type { PromptValue } from "@/lib/prompts/format";
import { handsOnQuizInstructions } from "@/lib/prompts/hands-on-quiz";
import { quizGeneratorSystem, quizGeneratorTask } from "@/lib/prompts/quiz-generator";
import { DocumentQuiz, type QuizCounts } from "@/lib/schemas";
import { reviewHandsOn } from "./hands-on-review";
import { runJSON } from "./run";

export async function generateQuiz(input: { learner_profile: PromptValue; learning_document: PromptValue } & z.output<typeof QuizCounts>) {
  const schema = input.hands_on ? DocumentQuiz.superRefine((quiz, ctx) => {
    const counts = {
      single_choice_questions: input.single_choice_count, multiple_choice_questions: input.multiple_choice_count,
      true_false_questions: input.true_false_count, short_answer_questions: input.short_answer_count,
    };
    for (const [key, count] of Object.entries(counts)) {
      if (quiz[key as keyof typeof counts].length !== count) ctx.addIssue({ code: "custom", path: [key], message: `Expected exactly ${count} questions` });
    }
    for (const key of ["ordering_questions", "configuration_questions"] as const) {
      if (!quiz[key] || quiz[key].length > 1) ctx.addIssue({ code: "custom", path: [key], message: "Return an array with zero or one applicable task" });
    }
    for (const [i, question] of (quiz.configuration_questions ?? []).entries()) {
      const values = [question.starter_configuration, ...question.correct_configurations].map((text) => configurationObject(text));
      if (values.some((value) => value === null)) continue;
      const objects = values.filter((value) => value !== null);
      const keys = JSON.stringify(Object.keys(objects[0]).sort());
      if (objects.some((value) => Object.keys(value).length < 2 || Object.keys(value).length > 5 ||
        JSON.stringify(Object.keys(value).sort()) !== keys || Object.values(value).some((v) => v !== null && typeof v === "object"))) {
        ctx.addIssue({ code: "custom", path: ["configuration_questions", i], message: "Use the same 2–5 fields with primitive values in every configuration" });
      }
    }
  }) : DocumentQuiz;
  const system = quizGeneratorSystem + (input.hands_on ? handsOnQuizInstructions : "");
  const quiz = await runJSON({ tier: "fast", system, task: quizGeneratorTask, vars: input }, schema);
  return input.hands_on ? reviewHandsOn(quiz, input.learning_document) : quiz;
}
