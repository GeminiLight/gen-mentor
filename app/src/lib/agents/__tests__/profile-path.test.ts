import { beforeEach, describe, expect, it, vi } from "vitest";
import { lastUserMessage, requests, reset } from "./fake-llm";
import path from "./fixtures/learning_path.json";
import profile from "./fixtures/learner_profile.json";

vi.mock("@/lib/llm", async () => (await import("./fake-llm")).fakeLLMModule());

const { initializeProfile, updateProfile } = await import("../profile");
const { schedulePath } = await import("../path");
const { LearnerProfile, LearningPath } = await import("@/lib/schemas");

describe("schemas: learner profile and learning path", () => {
  it("round-trip the example fixtures", () => {
    expect(LearnerProfile.parse(profile)).toEqual(profile);
    expect(LearningPath.parse(path)).toEqual(path);
  });
  it("clamps overall_progress and rejects an empty goal", () => {
    expect(LearnerProfile.parse({ ...profile, cognitive_status: { ...profile.cognitive_status, overall_progress: 140 } }).cognitive_status.overall_progress).toBe(100);
    expect(LearnerProfile.safeParse({ ...profile, learning_goal: "  " }).success).toBe(false);
  });
  it("truncates a path to ten sessions and rejects an empty one", () => {
    const long = { learning_path: Array.from({ length: 12 }, (_, i) => ({ ...path.learning_path[0], id: `Session ${i + 1}` })) };
    expect(LearningPath.parse(long).learning_path).toHaveLength(10);
    expect(LearningPath.safeParse({ learning_path: [] }).success).toBe(false);
  });
});

describe("agents: profiler", () => {
  beforeEach(() => reset());
  it("initializes a profile (Task A) with the goal, resume and gaps in the prompt", async () => {
    reset(profile);
    const out = await initializeProfile({ learning_goal: "G", learner_information: "CV", skill_gaps: { skill_gaps: [] } });
    expect(out).toEqual(profile);
    expect(lastUserMessage()).toMatch(/^Task A\. Initial Profiling/m);
    expect(lastUserMessage()).toContain("- Learning Goal: G");
  });
  it("updates a profile (Task B) and passes quiz performance through", async () => {
    reset(profile);
    await updateProfile({ learner_profile: profile, learner_interactions: { quiz_performance: { accuracy: 0.9 } } });
    expect(lastUserMessage()).toMatch(/^Task B: Profile Update/m);
    expect(lastUserMessage()).toContain('"accuracy": 0.9');
  });
});

describe("agents: path scheduler", () => {
  beforeEach(() => reset());
  it("streams deltas and resolves the validated path for Task A", async () => {
    reset(path);
    const deltas: string[] = [];
    const out = await schedulePath({ task: "create", learner_profile: profile, session_count: 5 }, (d) => deltas.push(d));
    expect(deltas.join("")).toBe(JSON.stringify(path));
    expect(out).toEqual(path);
    expect(lastUserMessage()).toContain("**Desired Session Count**: 5");
    expect(requests[0].tier).toBe("smart");
  });
  it("uses the reschedule task with -1 as the default session count", async () => {
    reset(path);
    await schedulePath({ task: "reschedule", learner_profile: profile, learning_path: path.learning_path });
    expect(lastUserMessage()).toMatch(/^\*\*Task C: Re-schedule Learning Path\*\*/m);
    expect(lastUserMessage()).toContain("**Desired Session Count**: -1");
  });
  it("uses the refine task with the feedback", async () => {
    reset(path);
    await schedulePath({ task: "refine", learning_path: path.learning_path, feedback: { progression: "too fast" } });
    expect(lastUserMessage()).toMatch(/^\*\*Task B: Reflection and Refinement\*\*/m);
    expect(lastUserMessage()).toContain("too fast");
  });
});
