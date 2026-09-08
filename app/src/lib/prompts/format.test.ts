import { describe, expect, it } from "vitest";
import { fill } from "./format";
import * as goal from "./goal-refiner";
import * as profiler from "./learner-profiler";
import * as scheduler from "./path-scheduler";

describe("fill", () => {
  it("substitutes placeholders, pretty-prints objects and leaves JSON braces alone", () => {
    const out = fill('Goal: {learning_goal}\nExample: {"a": 1}\n{profile}', { learning_goal: "g", profile: { x: [1] } });
    expect(out).toBe('Goal: g\nExample: {"a": 1}\n{\n  "x": [\n    1\n  ]\n}');
  });
  it("throws on a missing placeholder instead of leaving it in the prompt", () => {
    expect(() => fill("{learning_goal}", {})).toThrow(/learning_goal/);
  });
});

describe("ported prompts", () => {
  it("keep the paper's wording verbatim", () => {
    expect(goal.goalRefinerSystem).toContain("You are the **Learning Goal Refiner** agent in the GenMentor Intelligent Tutoring System.");
    expect(scheduler.pathSchedulerSystem).toContain("[cite_start]**Personalized**");
    expect(scheduler.pathSchedulerCreateTask).toContain("The number of sessions should be within [1, 10]; if the requested count falls\noutside that range, clamp it to the nearest bound.");
  });
  it("resolved Python's doubled braces in task prompts", () => {
    expect(profiler.learnerProfilerInitTask).toContain('{\n\t"learner_information"');
    expect(profiler.learnerProfilerUpdateTask).toContain("Session Information: {'id': 'Session 2'");
    expect(profiler.learnerProfilerInitTask).not.toContain("{{");
  });
});
