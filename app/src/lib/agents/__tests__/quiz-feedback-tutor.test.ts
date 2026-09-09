import { beforeEach, describe, expect, it, vi } from "vitest";
import { lastUserMessage, requests, reset } from "./fake-llm";
import quiz from "./fixtures/document_quiz.json";
import doc from "./fixtures/learning_document.json";
import profile from "./fixtures/learner_profile.json";

vi.mock("@/lib/llm", async () => (await import("./fake-llm")).fakeLLMModule());

const { generateQuiz } = await import("../quiz");
const { simulateFeedback } = await import("../feedback");
const { tutorReply } = await import("../tutor");
const { DocumentQuiz, LearnerFeedback } = await import("@/lib/schemas");

const feedback = {
  feedback: { progression: "p", engagement: "e", personalization: "z" },
  suggestions: { progression: "sp", engagement: "se", personalization: "sz" },
};

describe("schemas: quiz and feedback", () => {
  it("round-trips the quiz fixture and defaults missing question lists", () => {
    expect(DocumentQuiz.parse(quiz)).toEqual(quiz);
    expect(DocumentQuiz.parse({ single_choice_questions: [] })).toEqual({
      single_choice_questions: [],
      multiple_choice_questions: [],
      true_false_questions: [],
      short_answer_questions: [],
    });
    expect(LearnerFeedback.parse(feedback)).toEqual(feedback);
  });
});

describe("agents: quiz / feedback / tutor", () => {
  beforeEach(() => reset());

  it("generates a quiz with the requested counts in the prompt", async () => {
    reset(quiz);
    const out = await generateQuiz({ learner_profile: profile, learning_document: doc.document, single_choice_count: 3, multiple_choice_count: 1, true_false_count: 0, short_answer_count: 0 });
    expect(out.single_choice_questions).toHaveLength(quiz.single_choice_questions.length);
    expect(lastUserMessage()).toContain("* Single Choice: 3\n* Multiple Choice: 1\n* True/False: 0\n* Short Answer: 0");
    expect(requests[0].tier).toBe("fast");
  });

  it("simulates feedback on a path (Task A) and on content (Task B)", async () => {
    reset(feedback, feedback);
    await simulateFeedback({ target: "path", learner_profile: profile, learning_path: [] });
    expect(lastUserMessage()).toMatch(/^\*\*Task A: Learning Path Feedback\*\*/m);
    await simulateFeedback({ target: "content", learner_profile: profile, learning_content: "text" });
    expect(lastUserMessage()).toMatch(/^\*\*Task B: Learning Content Feedback\*\*/m);
  });

  it("streams the tutor reply with the history rendered as role: content lines", async () => {
    reset("Start with pd.read_csv.");
    const deltas: string[] = [];
    const text = await tutorReply(
      { messages: [{ role: "user", content: "Where do I start?" }, { role: "assistant", content: "Hi" }, { role: "user", content: "Pandas?" }], learner_profile: profile },
      (d) => deltas.push(d),
    );
    expect(text).toBe("Start with pd.read_csv.");
    expect(deltas.join("")).toBe(text);
    expect(lastUserMessage()).toContain("Conversation History:\nuser: Where do I start?\nassistant: Hi\nuser: Pandas?");
    expect(requests[0].system).toMatch(/AI tutor in a goal-oriented learning environment/);
  });
});
