import { LEVEL_ORDER, type CurrentLevel, type RequiredLevel } from "@/lib/schemas";
import type { Goal } from "./types";

export const skillKey = (name: string) => name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

/** Accepted goal requirements are the denominator, not a model's free-form percentage. */
export function targetSkills(goal: Goal) {
  const requirements = new Map<string, { name: string; required: RequiredLevel }>();
  const profile = goal.learner_profile.cognitive_status;
  const fallback = [
    ...profile.mastered_skills.map((s) => ({ name: s.name, required_level: s.proficiency_level })),
    ...profile.in_progress_skills.map((s) => ({ name: s.name, required_level: s.required_proficiency_level })),
  ];
  for (const item of goal.skill_requirements.length ? goal.skill_requirements : fallback) {
    const key = skillKey(item.name);
    const previous = requirements.get(key);
    if (!previous || LEVEL_ORDER[item.required_level] > LEVEL_ORDER[previous.required]) requirements.set(key, { name: item.name.trim(), required: item.required_level });
  }
  const levels = new Map<string, CurrentLevel>();
  // Conflicting duplicate observations use the lower estimate rather than inflate progress.
  for (const item of [
    ...profile.mastered_skills.map((s) => ({ name: s.name, level: s.proficiency_level })),
    ...profile.in_progress_skills.map((s) => ({ name: s.name, level: s.current_proficiency_level })),
  ]) {
    const key = skillKey(item.name), previous = levels.get(key);
    if (previous === undefined || LEVEL_ORDER[item.level] < LEVEL_ORDER[previous]) levels.set(key, item.level);
  }
  return [...requirements].map(([key, item]) => {
    const current = levels.get(key) ?? goal.skill_gaps.find((s) => skillKey(s.name) === key)?.current_level ?? "unlearned";
    return { ...item, key, current, currentRank: LEVEL_ORDER[current], requiredRank: LEVEL_ORDER[item.required], mastered: LEVEL_ORDER[current] >= LEVEL_ORDER[item.required] };
  });
}

export function targetProgress(goal: Goal) {
  const skills = targetSkills(goal);
  return skills.length ? Math.round(skills.filter((s) => s.mastered).length / skills.length * 100) : 0;
}
