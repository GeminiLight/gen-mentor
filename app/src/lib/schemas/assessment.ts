/** Quiz shapes. Option indices may come back as strings from the model; keep both like the original. */
import { z } from "zod";

const OptionIndex = z.union([z.number().int(), z.string()]);

export const SingleChoiceQuestion = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correct_option: OptionIndex,
  explanation: z.string().nullable().optional(),
});
export const MultipleChoiceQuestion = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correct_options: z.array(OptionIndex),
  explanation: z.string().nullable().optional(),
});
export const TrueFalseQuestion = z.object({ question: z.string(), correct_answer: z.boolean(), explanation: z.string().nullable().optional() });
export const ShortAnswerQuestion = z.object({ question: z.string(), expected_answer: z.string(), explanation: z.string().nullable().optional() });

export const DocumentQuiz = z.object({
  single_choice_questions: z.array(SingleChoiceQuestion).default([]),
  multiple_choice_questions: z.array(MultipleChoiceQuestion).default([]),
  true_false_questions: z.array(TrueFalseQuestion).default([]),
  short_answer_questions: z.array(ShortAnswerQuestion).default([]),
});
export type DocumentQuiz = z.infer<typeof DocumentQuiz>;

export const QuizCounts = z.object({
  single_choice_count: z.number().int().min(0).max(20).default(3),
  multiple_choice_count: z.number().int().min(0).max(20).default(0),
  true_false_count: z.number().int().min(0).max(20).default(0),
  short_answer_count: z.number().int().min(0).max(20).default(0),
});
