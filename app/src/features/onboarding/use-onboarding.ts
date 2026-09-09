"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { useT, type Key } from "@/lib/i18n";
import { parsePartialJSON } from "@/lib/llm/partial-json";
import type { LearnerProfile, LearningPath, SkillGaps, SkillRequirements } from "@/lib/schemas";
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

export interface OnboardingInput {
  learning_goal: string;
  learner_information: string;
  session_count: number;
}

/** What earlier steps produced for the current input; a retry resumes from here instead of starting over. */
interface Done {
  refined_goal?: string;
  gap?: SkillGaps & SkillRequirements;
  learner_profile?: LearnerProfile;
}

const PENDING: Record<Step, StageStatus> = { refine: "pending", gap: "pending", profile: "pending", path: "pending" };
const sameInput = (a: OnboardingInput | null, b: OnboardingInput) =>
  !!a && a.learning_goal === b.learning_goal && a.learner_information === b.learner_information && a.session_count === b.session_count;

/** Runs the four onboarding agents in sequence and lands the learner on their new path. */
export function useOnboarding() {
  const router = useRouter();
  const addGoal = useArchive((s) => s.addGoal);
  const { t } = useT();
  const [status, setStatus] = useState<Record<Step, StageStatus>>(PENDING);
  const [preview, setPreview] = useState<Preview>({});
  const [error, setError] = useState<string | null>(null);
  const last = useRef<{ input: OnboardingInput; done: Done } | null>(null);
  const running = Object.values(status).some((s) => s === "running");

  const run = useCallback(
    async (input: OnboardingInput) => {
      const { learning_goal, learner_information, session_count } = input;
      // Same input again means a retry: keep what already succeeded. New input starts clean.
      const done: Done = sameInput(last.current?.input ?? null, input) ? (last.current?.done ?? {}) : {};
      last.current = { input, done };
      const mark = (k: Step, s: StageStatus) => setStatus((st) => ({ ...st, [k]: s }));
      setError(null);
      setPreview({ refined_goal: done.refined_goal, gaps: done.gap?.skill_gaps });
      setStatus({ ...PENDING, refine: done.refined_goal ? "done" : "pending", gap: done.gap ? "done" : "pending", profile: done.learner_profile ? "done" : "pending" });
      let step: Step = "refine";
      try {
        if (!done.refined_goal) {
          mark("refine", "running");
          done.refined_goal = (await api.refineGoal({ learning_goal, learner_information })).refined_goal;
          setPreview((p) => ({ ...p, refined_goal: done.refined_goal }));
          mark("refine", "done");
        }
        const refined_goal = done.refined_goal;

        step = "gap";
        if (!done.gap) {
          mark("gap", "running");
          done.gap = await api.identifySkillGap({ learning_goal: refined_goal, learner_information });
          setPreview((p) => ({ ...p, gaps: done.gap?.skill_gaps }));
          mark("gap", "done");
        }
        const gap = done.gap;

        step = "profile";
        if (!done.learner_profile) {
          mark("profile", "running");
          done.learner_profile = (await api.profile({ mode: "init", learning_goal: refined_goal, learner_information, skill_gaps: { skill_gaps: gap.skill_gaps } })).learner_profile;
          mark("profile", "done");
        }
        const learner_profile = done.learner_profile;

        step = "path";
        mark("path", "running");
        const { final } = await api.schedulePath({ task: "create", learner_profile, session_count }, (text) => {
          const partial = parsePartialJSON<LearningPath>(text);
          if (partial) setPreview((p) => ({ ...p, path: partial }));
        });
        if (!final) throw new Error(t("onboarding.schedulerNoPath"));
        mark("path", "done");

        addGoal({
          id: `g_${Date.now().toString(36)}`,
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
        last.current = null;
        toast.success(t("onboarding.ready"), { description: t("path.rescheduledBody", { n: final.learning_path.length }) });
        router.push("/learning-path");
      } catch (e) {
        mark(step, "error");
        setError(e instanceof Error ? e.message : t("onboarding.genericError"));
      }
    },
    [addGoal, router, t],
  );

  const retry = useCallback(() => {
    if (last.current) void run(last.current.input);
  }, [run]);

  return { run, retry, status, preview, error, running };
}
