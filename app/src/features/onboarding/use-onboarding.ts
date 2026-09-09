"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/lib/client";
import { useT, type Key } from "@/lib/i18n";
import { parsePartialJSON } from "@/lib/llm/partial-json";
import type { LearningPath } from "@/lib/schemas";
import { useArchive } from "@/lib/store";
import { masteryRate } from "@/lib/store/derive";
import type { StageStatus } from "@/components/stage-list";

export type Step = "refine" | "gap" | "profile" | "path";
export const STEPS: { key: Step; label: Key }[] = [
  { key: "refine", label: "onboarding.stepRefine" },
  { key: "gap", label: "onboarding.stepGap" },
  { key: "profile", label: "onboarding.stepProfile" },
  { key: "path", label: "onboarding.stepPath" },
];

export interface Preview {
  refined_goal?: string;
  gaps?: { name: string; is_gap: boolean; current_level: string; required_level: string }[];
  path?: Partial<LearningPath>;
}

/** Runs the four onboarding agents in sequence and lands the learner on their new path. */
export function useOnboarding() {
  const router = useRouter();
  const addGoal = useArchive((s) => s.addGoal);
  const { t } = useT();
  const [status, setStatus] = useState<Record<Step, StageStatus>>({ refine: "pending", gap: "pending", profile: "pending", path: "pending" });
  const [preview, setPreview] = useState<Preview>({});
  const [error, setError] = useState<string | null>(null);
  const running = Object.values(status).some((s) => s === "running");

  const run = useCallback(
    async (learning_goal: string, learner_information: string, session_count: number) => {
      const mark = (k: Step, s: StageStatus) => setStatus((st) => ({ ...st, [k]: s }));
      setError(null);
      setPreview({});
      let step: Step = "refine";
      try {
        mark("refine", "running");
        const { refined_goal } = await api.refineGoal({ learning_goal, learner_information });
        setPreview((p) => ({ ...p, refined_goal }));
        mark("refine", "done");

        step = "gap";
        mark("gap", "running");
        const gap = await api.identifySkillGap({ learning_goal: refined_goal, learner_information });
        setPreview((p) => ({ ...p, gaps: gap.skill_gaps }));
        mark("gap", "done");

        step = "profile";
        mark("profile", "running");
        const { learner_profile } = await api.profile({ mode: "init", learning_goal: refined_goal, learner_information, skill_gaps: { skill_gaps: gap.skill_gaps } });
        mark("profile", "done");

        step = "path";
        mark("path", "running");
        const { final } = await api.schedulePath({ task: "create", learner_profile, session_count }, (t) => {
          const partial = parsePartialJSON<LearningPath>(t);
          if (partial) setPreview((p) => ({ ...p, path: partial }));
        });
        if (!final) throw new Error(t("onboarding.schedulerNoPath"));
        mark("path", "done");

        const id = `g_${Date.now().toString(36)}`;
        addGoal({
          id,
          created_at: Date.now(),
          original_goal: learning_goal,
          learning_goal: refined_goal,
          learner_information,
          skill_requirements: gap.skill_requirements,
          skill_gaps: gap.skill_gaps,
          learner_profile,
          learning_path: final.learning_path,
          sessions: {},
          mastery_history: [{ ts: Date.now(), rate: masteryRate(learner_profile), overall_progress: learner_profile.cognitive_status.overall_progress }],
          tutor: [],
        });
        router.push("/learning-path");
      } catch (e) {
        mark(step, "error");
        setError(e instanceof Error ? e.message : t("onboarding.genericError"));
      }
    },
    [addGoal, router, t],
  );

  return { run, status, preview, error, running };
}
