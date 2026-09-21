import { beforeEach, expect, it, vi } from "vitest";
import { requests, reset } from "./fake-llm";
vi.mock("@/lib/llm", async () => (await import("./fake-llm")).fakeLLMModule());
const { generateQuiz } = await import("../quiz");
const input = { learner_profile: "Beginner", learning_document: "Collect, validate, then publish.", hands_on: true, single_choice_count: 0, multiple_choice_count: 0, true_false_count: 0, short_answer_count: 0 };
const quiz = {
  single_choice_questions: [], multiple_choice_questions: [], true_false_questions: [], short_answer_questions: [],
  ordering_questions: [{ question: "Arrange the workflow", items: ["Publish", "Validate", "Collect"], correct_order: [2, 1, 0], explanation: "Validate collected changes before publishing." }],
  configuration_questions: [],
};
const approval = { ordering_approved: true, configuration_approved: false, reason: "The workflow has a unique dependency chain." };
beforeEach(() => reset());

it("adds grounded hands-on instructions without changing model parameters", async () => {
  reset(quiz, approval);
  expect((await generateQuiz(input)).ordering_questions).toHaveLength(1);
  expect(requests[0].system).toContain("Hands-on extension");
  expect(requests[0].system).toContain("never invent technical settings");
  expect(requests[0].maxTokens).toBe(8000);
  expect(requests[0].tier).toBe("fast");
});
it("repairs wrong counts and incomplete hands-on output through the existing retry", async () => {
  reset({ ...quiz, configuration_questions: undefined, short_answer_questions: [{ question: "Extra", expected_answer: "No" }] }, quiz, approval);
  expect(await generateQuiz(input)).toEqual(quiz);
  expect(requests).toHaveLength(3);
  expect(requests[1].messages.at(-1)?.content).toContain("Expected exactly 0 questions");
  expect(requests[1].messages.at(-1)?.content).toContain("configuration_questions");
});
it("allows omission of inapplicable operations but rejects excess tasks twice", async () => {
  reset({ ...quiz, ordering_questions: [] });
  expect((await generateQuiz(input)).ordering_questions).toEqual([]);
  const excess = { ...quiz, ordering_questions: [quiz.ordering_questions[0], quiz.ordering_questions[0]] };
  reset(excess, excess);
  await expect(generateQuiz(input)).rejects.toThrow("failed validation twice");
});
it("repairs invalid JSON and rejects ambiguous complex configurations", async () => {
  const bad = { ...quiz, configuration_questions: [{ question: "Configure", starter_configuration: "{", correct_configurations: ['{"enabled":true,"port":8080}'], explanation: "Use the production port" }] };
  reset(bad, quiz, approval);
  expect(await generateQuiz(input)).toEqual(quiz);
  const nested = { ...quiz, configuration_questions: [{ ...bad.configuration_questions[0], starter_configuration: '{"enabled":false,"ports":[80]}', correct_configurations: ['{"enabled":true,"ports":[8080]}'] }] };
  reset(nested, quiz, approval);
  expect(await generateQuiz(input)).toEqual(quiz);
  expect(requests[1].messages.at(-1)?.content).toContain("primitive values");
});

it("removes unapproved operations without replacing them or losing standard questions", async () => {
  const standard = { question: "A core concept", options: ["yes", "no"], correct_option: 0 };
  reset({ ...quiz, single_choice_questions: [standard] }, { ...approval, ordering_approved: false, reason: "Independent steps have multiple valid orders." });
  const output = await generateQuiz({ ...input, single_choice_count: 1 });
  expect(output.ordering_questions).toEqual([]);
  expect(output.single_choice_questions).toEqual([standard]);
  expect(requests[1].tier).toBe("smart");
});
