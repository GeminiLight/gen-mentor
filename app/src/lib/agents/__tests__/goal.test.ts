import { beforeEach, describe, expect, it, vi } from "vitest";
import { lastUserMessage, requests, reset } from "./fake-llm";
import gaps from "./fixtures/skill_gaps.json";

vi.mock("@/lib/llm", async () => (await import("./fake-llm")).fakeLLMModule());

const { identifySkillGaps, mapSkills, refineGoal } = await import("../goal");
const { SkillGaps, SkillRequirements } = await import("@/lib/schemas");

const requirements = SkillRequirements.parse({ skill_requirements: gaps.skill_gaps.map((g) => ({ name: g.name, required_level: g.required_level })) });

describe("schemas: skill gaps and requirements", () => {
  it("round-trips the example fixture", () => {
    expect(SkillGaps.parse(gaps)).toEqual(gaps);
  });
  it("recomputes is_gap from levels, truncates reasons, dedupes and caps at ten", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      name: i < 2 ? "sql" : `Skill ${i}`,
      is_gap: false,
      required_level: "advanced",
      current_level: "beginner",
      reason: Array.from({ length: 30 }, (_, k) => `w${k}`).join(" "),
      level_confidence: "low",
    }));
    const out = SkillGaps.parse({ skill_gaps: many });
    expect(out.skill_gaps).toHaveLength(10);
    expect(out.skill_gaps[0]).toMatchObject({ name: "sql", is_gap: true });
    expect(out.skill_gaps[0].reason.split(" ")).toHaveLength(20);
    expect(out.skill_gaps.filter((g) => g.name.toLowerCase() === "sql")).toHaveLength(1);
  });
  it("accepts a bare array and rejects an empty list", () => {
    expect(SkillRequirements.parse([{ name: "SQL", required_level: "advanced" }])).toEqual({ skill_requirements: [{ name: "SQL", required_level: "advanced" }] });
    expect(SkillRequirements.safeParse({ skill_requirements: [] }).success).toBe(false);
  });
});

describe("agents: goal refiner / mapper / gap identifier", () => {
  beforeEach(() => reset());

  it("refines a goal and renders both placeholders into the task prompt", async () => {
    reset({ refined_goal: "Learn Python for data analysis, focusing on Pandas." });
    const out = await refineGoal({ learning_goal: "learn python", learner_information: "marketing analyst" });
    expect(out.refined_goal).toMatch(/Pandas/);
    expect(lastUserMessage()).toContain("**Original Learning Goal**:\nlearn python");
    expect(lastUserMessage()).toContain("marketing analyst");
    expect(requests[0].tier).toBe("fast");
  });

  it("maps skills on the smart tier", async () => {
    reset(requirements);
    await expect(mapSkills({ learning_goal: "g" })).resolves.toEqual(requirements);
    expect(requests[0].tier).toBe("smart");
  });

  it("runs the mapper first when requirements are missing, then merges both outputs", async () => {
    reset(requirements, gaps);
    const out = await identifySkillGaps({ learning_goal: "g", learner_information: "cv" });
    expect(requests).toHaveLength(2);
    expect(lastUserMessage()).toContain('"required_level": "intermediate"');
    expect(out).toEqual({ ...gaps, ...requirements });
  });

  it("re-asks once with the validation issues when the first answer breaks the contract", async () => {
    reset({ skill_gaps: [] }, gaps);
    const out = await identifySkillGaps({ learning_goal: "g", learner_information: "cv", skill_requirements: requirements });
    expect(out.skill_gaps).toHaveLength(gaps.skill_gaps.length);
    expect(requests).toHaveLength(2);
    expect(lastUserMessage()).toMatch(/violated the output contract/);
    expect(lastUserMessage()).toMatch(/At least one skill gap/);
  });
});
