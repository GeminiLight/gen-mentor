"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { quizPerformance } from "@/lib/quiz";
import type { SessionItem } from "@/lib/schemas";
import { useArchive, type Goal } from "@/lib/store";
import { masteryRate, sessionUid } from "@/lib/store/derive";

/**
 * Completing a session is what moves the learner model: the profiler rebuilds the profile
 * with the quiz as evidence, the session is marked learned, and a mastery point is recorded.
 */
export function useCompleteSession(goal: Goal | null, session: SessionItem | undefined, index: number) {
  const { updateGoal, patchSession, recordMastery } = useArchive();
  const router = useRouter();
  const [completing, setCompleting] = useState(false);

  const complete = async () => {
    if (!goal || !session) return;
    const uid = sessionUid(goal.id, index);
    setCompleting(true);
    try {
      const results = goal.sessions[uid]?.quiz_results;
      const interactions =
        results && results.answered > 0 ? { quiz_performance: quizPerformance(results, session.title) } : {};
      const { learner_profile } = await api.profile({
        mode: "update",
        learner_profile: goal.learner_profile,
        learner_interactions: interactions,
        session_information: { ...session, if_learned: true },
      });
      updateGoal(goal.id, (g) => ({
        learner_profile,
        learning_path: g.learning_path.map((s, i) => (i === index ? { ...s, if_learned: true } : s)),
      }));
      patchSession(uid, { completed_at: Date.now() });
      recordMastery(goal.id, masteryRate(learner_profile), learner_profile.cognitive_status.overall_progress);
      toast.success("Session completed", {
        description: `Profile updated. Overall progress ${learner_profile.cognitive_status.overall_progress}%.`,
      });
      router.push("/learning-path");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update your profile");
    } finally {
      setCompleting(false);
    }
  };

  return { complete, completing };
}
