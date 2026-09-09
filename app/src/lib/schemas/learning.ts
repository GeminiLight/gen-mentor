/** Goal refinement, skill mapping, skill gaps, learner profile. Mirrors the Pydantic
 *  models one-to-one, including their repair-not-reject behavior. */
import { z } from "zod";
import { Confidence, CurrentLevel, dedupeByName, envelope, LEVEL_ORDER, RequiredLevel } from "./levels";

export const RefinedGoal = z.object({ refined_goal: z.string().trim().min(1) });
export type RefinedGoal = z.infer<typeof RefinedGoal>;

export const SkillRequirement = z.object({ name: z.string().trim().min(1), required_level: RequiredLevel });
export const SkillRequirements = z.preprocess(
  envelope("skill_requirements"),
  z.object({
    skill_requirements: z.array(SkillRequirement).min(1, "At least one skill requirement is needed.").transform((v) => dedupeByName(v)),
  }),
);
export type SkillRequirements = z.infer<typeof SkillRequirements>;

/** `is_gap` is derived from the two levels; a wrong flag from the model is corrected, not rejected. */
export const SkillGap = z
  .object({
    name: z.string().trim().min(1),
    is_gap: z.boolean().optional(),
    required_level: RequiredLevel,
    current_level: CurrentLevel,
    reason: z.string().transform((v) => v.split(/\s+/).filter(Boolean).slice(0, 20).join(" ")),
    level_confidence: Confidence,
  })
  .transform((g) => ({ ...g, is_gap: LEVEL_ORDER[g.current_level] < LEVEL_ORDER[g.required_level] }));
export type SkillGap = z.infer<typeof SkillGap>;

export const SkillGaps = z.preprocess(
  envelope("skill_gaps"),
  z.object({ skill_gaps: z.array(SkillGap).min(1, "At least one skill gap is needed.").transform((v) => dedupeByName(v)) }),
);
export type SkillGaps = z.infer<typeof SkillGaps>;

export const MasteredSkill = z.object({ name: z.string(), proficiency_level: RequiredLevel });
export const InProgressSkill = z.object({
  name: z.string(),
  required_proficiency_level: RequiredLevel,
  current_proficiency_level: CurrentLevel,
});

const clampProgress = (v: unknown) => {
  const n = typeof v === "string" ? Number.parseInt(v, 10) : typeof v === "number" ? Math.trunc(v) : Number.NaN;
  return Number.isNaN(n) ? v : Math.max(0, Math.min(100, n));
};

export const CognitiveStatus = z.object({
  overall_progress: z.preprocess(clampProgress, z.number().int().min(0).max(100)),
  mastered_skills: z.array(MasteredSkill).default([]),
  in_progress_skills: z.array(InProgressSkill).default([]),
});

export const LearningPreferences = z.object({
  content_style: z.string(),
  activity_type: z.string(),
  additional_notes: z.string().nullable().optional(),
});

export const BehavioralPatterns = z.object({
  system_usage_frequency: z.string(),
  session_duration_engagement: z.string(),
  motivational_triggers: z.string().nullable().optional(),
  additional_notes: z.string().nullable().optional(),
});

export const LearnerProfile = z.object({
  learner_information: z.string(),
  learning_goal: z.string().trim().min(1, "learning_goal must be non-empty"),
  cognitive_status: CognitiveStatus,
  learning_preferences: LearningPreferences,
  behavioral_patterns: BehavioralPatterns,
});
export type LearnerProfile = z.infer<typeof LearnerProfile>;
