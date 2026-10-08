import { z } from "zod";
import { configurationObject, sameConfiguration, validOrder } from "@/lib/configuration";

const Text = z.string().trim().min(1).max(2000);
const Configuration = z.string().max(12000).refine((text) => configurationObject(text) !== null, "Use a valid JSON object");

export const OrderingQuestion = z.object({
  question: Text,
  items: z.array(Text).min(3).max(8),
  correct_order: z.array(z.number().int().nonnegative()).min(3).max(8),
  explanation: Text,
}).refine((q) => new Set(q.items).size === q.items.length, "Steps must be distinct")
  .refine((q) => validOrder(q.correct_order, q.items.length), "correct_order must contain every item index exactly once")
  .refine((q) => q.correct_order.some((item, i) => item !== i), "Present the steps in a scrambled order");

export const ConfigurationQuestion = z.object({
  question: Text,
  starter_configuration: Configuration,
  correct_configurations: z.array(Configuration).min(1).max(4),
  explanation: Text,
}).refine((q) => q.correct_configurations.every((value) => !sameConfiguration(value, q.starter_configuration)), "Starter must require a change");

export const OrderingAnswer = z.object({ order: z.array(z.number().int().nonnegative()).max(8), confirmed: z.boolean() });
export const ConfigurationAnswer = z.object({ value: z.string().max(12000), confirmed: z.boolean() });
export type OrderingAnswer = z.infer<typeof OrderingAnswer>;
export type ConfigurationAnswer = z.infer<typeof ConfigurationAnswer>;
