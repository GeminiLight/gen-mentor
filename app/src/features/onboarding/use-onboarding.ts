"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { parsePartialJSON } from "@/lib/llm/partial-json";
import { SkillGap, type LearningPath, type CurrentLevel, type RequiredLevel } from "@/lib/schemas";
import { useArchive } from "@/lib/store";
import { useOnboardingDraft, type OnboardingCheckpoint } from "@/lib/store/onboarding-draft";
import { masteryRate } from "@/lib/store/derive";
import type { StageStatus } from "@/components/stage-list";
import { PENDING, progressOf, REVIEW_MS, sameInput, type OnboardingInput, type Preview, type Review, type Step } from "./onboarding-state";

export function useOnboarding() {
  const router = useRouter();
  const addGoal = useArchive((s) => s.addGoal);
  const { t } = useT();
  const [status, setStatus] = useState(PENDING);
  const [preview, setPreview] = useState<Preview>({});
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<OnboardingCheckpoint | null>(null);
  const generation = useRef(0);
  const running = Object.values(status).some((s) => s === "running");
  const persist = (cp: OnboardingCheckpoint) => {
    last.current = cp;
    useOnboardingDraft.getState().patch({ checkpoint: { ...cp, done: { ...cp.done } } });
  };
  const mark = (step: Step, state: StageStatus) => setStatus((s) => ({ ...s, [step]: state }));

  useEffect(() => {
    let mounted = true;
    const lifetime = generation;
    void Promise.resolve().then(() => {
      const { checkpoint: cp, goal, info, count } = useOnboardingDraft.getState();
      if (!mounted || last.current || !cp?.review || !sameInput(cp.input, { learning_goal: goal.trim(), learner_information: info.trim(), session_count: Number(count) })) return;
      last.current = cp;
      setReview(cp.review);
      setPreview({ refined_goal: cp.done.refined_goal, gaps: cp.done.gap?.skill_gaps });
      setStatus(progressOf(cp));
    });
    return () => { mounted = false; lifetime.current++; };
  }, []);

  const finish = useCallback(async (cp: OnboardingCheckpoint, token: number) => {
    const active = () => generation.current === token;
    const { input, done } = cp;
    if (!done.gap || !done.refined_goal || !done.confirmed) return;
    let step: Step = "profile";
    try {
      if (!done.learner_profile) {
        mark("profile", "running");
        const result = await api.profile({ mode: "init", learning_goal: done.refined_goal, learner_information: input.learner_information, skill_gaps: { skill_gaps: done.gap.skill_gaps } });
        if (!active()) return;
        done.learner_profile = result.learner_profile;
        persist(cp);
        mark("profile", "done");
      }
      step = "path";
      mark("path", "running");
      const learner_profile = done.learner_profile;
      const { final } = await api.schedulePath({ task: "create", learner_profile, session_count: input.session_count }, (text) => {
        const partial = parsePartialJSON<LearningPath>(text);
        if (active() && partial) setPreview((p) => ({ ...p, path: partial }));
      });
      if (!active()) return;
      if (!final) throw new Error(t("onboarding.schedulerNoPath"));
      mark("path", "done");
      addGoal({
        id: `g_${Date.now().toString(36)}`, created_at: Date.now(), original_goal: input.learning_goal,
        learning_goal: done.refined_goal, learner_information: input.learner_information,
        skill_requirements: done.gap.skill_requirements, skill_gaps: done.gap.skill_gaps, learner_profile,
        learning_path: final.learning_path, sessions: {},
        mastery_history: [{ ts: Date.now(), rate: masteryRate(learner_profile), overall_progress: learner_profile.cognitive_status.overall_progress }], tutor: [],
      });
      last.current = null;
      useOnboardingDraft.getState().clear();
      toast.success(t("onboarding.ready"), { description: t("path.rescheduledBody", { n: final.learning_path.length }) });
      router.push("/learning-path");
    } catch (e) {
      if (!active()) return;
      mark(step, "error");
      setError(e instanceof Error ? e.message : t("onboarding.genericError"));
    }
  }, [addGoal, router, t]);

  const run = useCallback(async (input: OnboardingInput, editedGoal?: string) => {
    const token = ++generation.current;
    const active = () => token === generation.current;
    const saved = last.current ?? useOnboardingDraft.getState().checkpoint;
    const done = editedGoal !== undefined ? { refined_goal: editedGoal.trim() } : sameInput(saved?.input, input) ? { ...saved!.done } : {};
    const cp: OnboardingCheckpoint = { input, done };
    // Only this confirmation workflow may approve a profile; legacy checkpoints need review.
    if (!done.confirmed) delete done.learner_profile;
    if (done.refined_goal) persist(cp);
    else { last.current = cp; useOnboardingDraft.getState().patch({ checkpoint: null }); }
    setReview(null);
    setError(null);
    setStatus(progressOf(cp));
    setPreview({ refined_goal: done.refined_goal, gaps: done.gap?.skill_gaps });
    let step: Step = "refine";
    try {
      if (!done.refined_goal) {
        mark("refine", "running");
        const result = await api.refineGoal({ learning_goal: input.learning_goal, learner_information: input.learner_information });
        if (!active()) return;
        done.refined_goal = result.refined_goal;
        persist(cp);
        setPreview({ refined_goal: done.refined_goal });
        mark("refine", "done");
      }
      step = "gap";
      if (!done.gap) {
        mark("gap", "running");
        const result = await api.identifySkillGap({ learning_goal: done.refined_goal, learner_information: input.learner_information });
        if (!active()) return;
        done.gap = result;
        persist(cp);
        setPreview({ refined_goal: done.refined_goal, gaps: result.skill_gaps });
        mark("gap", "done");
      }
      if (done.confirmed) { void finish(cp, token); return; }
      cp.review = { deadline: Date.now() + REVIEW_MS };
      persist(cp);
      setReview(cp.review);
    } catch (e) {
      if (!active()) return;
      mark(step, "error");
      setError(e instanceof Error ? e.message : t("onboarding.genericError"));
    }
  }, [finish, t]);

  const confirm = useCallback(() => {
    const cp = last.current;
    if (!cp?.review || cp.review.goal_draft !== undefined || !cp.done.gap) return;
    const next = { ...cp, review: undefined, done: { ...cp.done, confirmed: true } };
    persist(next); // The synchronous update makes timer + click confirmation idempotent.
    setReview(null);
    setError(null);
    void finish(next, ++generation.current);
  }, [finish]);

  const extend = () => {
    const cp = last.current;
    if (!cp?.review || cp.review.goal_draft !== undefined) return;
    const next = { ...cp, review: { deadline: Date.now() + REVIEW_MS } };
    persist(next); setReview(next.review);
  };
  const editGoal = (value: string) => {
    const cp = last.current;
    if (!cp?.done.refined_goal) return;
    generation.current++;
    const next = { ...cp, done: { ...cp.done, confirmed: false, learner_profile: undefined }, review: { deadline: null, goal_draft: value } };
    persist(next); setReview(next.review); setStatus(progressOf(next)); setError(null);
  };
  const cancelEdit = () => {
    const cp = last.current;
    if (!cp) return;
    if (!cp.done.gap) { void run(cp.input); return; }
    const next = { ...cp, review: { deadline: Date.now() + REVIEW_MS } };
    persist(next); setReview(next.review);
  };
  const saveGoal = () => {
    const cp = last.current;
    const text = cp?.review?.goal_draft?.trim();
    if (!cp || !text) return;
    if (text === cp.done.refined_goal) { cancelEdit(); return; }
    void run(cp.input, text);
  };
  const changeLevel = (index: number, field: "current_level" | "required_level", value: CurrentLevel | RequiredLevel) => {
    const cp = last.current;
    if (!cp?.review || cp.review.goal_draft !== undefined || !cp.done.gap) return;
    const skill_gaps = cp.done.gap.skill_gaps.map((g, i) => i === index ? SkillGap.parse({ ...g, [field]: value, ...(field === "current_level" ? { level_confidence: "high" } : {}) }) : g);
    const next = { ...cp, done: { ...cp.done, confirmed: false, learner_profile: undefined, gap: { skill_gaps, skill_requirements: skill_gaps.map(({ name, required_level }) => ({ name, required_level })) } }, review: { deadline: Date.now() + REVIEW_MS } };
    persist(next); setReview(next.review); setPreview((p) => ({ ...p, gaps: skill_gaps }));
  };
  const back = () => {
    generation.current++; last.current = null;
    useOnboardingDraft.getState().patch({ checkpoint: null });
    setReview(null); setPreview({}); setStatus(PENDING); setError(null);
  };
  const retry = () => { if (last.current) void run(last.current.input); };
  return { run, retry, status, preview, error, running, review, confirm, extend, editGoal, cancelEdit, saveGoal, changeLevel, back };
}
