/** Goal Refiner, Skill Mapper and Skill Gap Identifier. */
import { goalRefinerSystem, goalRefinerTask } from "@/lib/prompts/goal-refiner";
import { skillGapIdentifierSystem, skillGapIdentifierTask } from "@/lib/prompts/skill-gap-identifier";
import { skillMapperSystem, skillMapperTask } from "@/lib/prompts/skill-mapper";
import { RefinedGoal, SkillGaps, SkillRequirements } from "@/lib/schemas";
import { runJSON } from "./run";

export function refineGoal(input: { learning_goal: string; learner_information?: string }) {
  return runJSON(
    { tier: "fast", system: goalRefinerSystem, task: goalRefinerTask, vars: { learning_goal: input.learning_goal, learner_information: input.learner_information ?? "" } },
    RefinedGoal,
  );
}

export function mapSkills(input: { learning_goal: string }) {
  return runJSON({ tier: "smart", system: skillMapperSystem, task: skillMapperTask, vars: input }, SkillRequirements);
}

/** Runs the mapper first unless requirements are supplied, then identifies gaps against them. */
export async function identifySkillGaps(input: {
  learning_goal: string;
  learner_information: string;
  skill_requirements?: SkillRequirements | null;
}) {
  const skill_requirements = input.skill_requirements ?? (await mapSkills({ learning_goal: input.learning_goal }));
  const gaps = await runJSON(
    {
      tier: "smart",
      system: skillGapIdentifierSystem,
      task: skillGapIdentifierTask,
      vars: { learning_goal: input.learning_goal, learner_information: input.learner_information, skill_requirements },
    },
    SkillGaps,
  );
  return { ...gaps, ...skill_requirements };
}
