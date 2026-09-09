/**
 * Runs every agent over the fixed eval cases with whichever prompt set the config resolves,
 * and writes one JSON per case × agent to EVAL_OUT. Errors are recorded, never thrown, so a
 * single bad answer does not hide the rest of the run.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, test } from "vitest";
import { identifySkillGaps, refineGoal } from "@/lib/agents/goal";
import { draftKnowledge, exploreKnowledge, integrateDocument } from "@/lib/agents/knowledge";
import { schedulePath } from "@/lib/agents/path";
import { initializeProfile, updateProfile } from "@/lib/agents/profile";
import { generateQuiz } from "@/lib/agents/quiz";
import { simulateFeedback } from "@/lib/agents/feedback";
import { tutorReply } from "@/lib/agents/tutor";

interface Case {
  id: string;
  learning_goal: string;
  learner_information: string;
  question: string;
}

const OUT = process.env.EVAL_OUT ?? resolve(process.cwd(), "..", "e2e", "artifacts", "eval", "current");
const CASES = JSON.parse(readFileSync(resolve(process.cwd(), "..", "e2e", "fixtures", "eval", "cases.json"), "utf8")) as Case[];
const only = process.env.EVAL_CASES?.split(",").filter(Boolean);
mkdirSync(OUT, { recursive: true });

async function step<T>(c: Case, agent: string, run: () => Promise<T>): Promise<T | null> {
  const t0 = Date.now();
  try {
    const output = await run();
    writeFileSync(join(OUT, `${c.id}--${agent}.json`), JSON.stringify({ case: c.id, agent, ms: Date.now() - t0, output }, null, 2));
    return output;
  } catch (e) {
    writeFileSync(join(OUT, `${c.id}--${agent}.json`), JSON.stringify({ case: c.id, agent, ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) }, null, 2));
    return null;
  }
}

describe("prompt eval", () => {
  for (const c of CASES.filter((c) => !only || only.includes(c.id))) {
    test.concurrent(c.id, async () => {
      const refined = await step(c, "goal-refiner", () => refineGoal({ learning_goal: c.learning_goal, learner_information: c.learner_information }));
      const goal = refined?.refined_goal ?? c.learning_goal;
      const gap = await step(c, "skill-gap", () => identifySkillGaps({ learning_goal: goal, learner_information: c.learner_information }));
      if (!gap) return;
      const profile = await step(c, "profiler-init", () => initializeProfile({ learning_goal: goal, learner_information: c.learner_information, skill_gaps: { skill_gaps: gap.skill_gaps } }));
      if (!profile) return;
      const path = await step(c, "path-scheduler", () => schedulePath({ task: "create", learner_profile: profile, session_count: 4 }));
      if (!path) return;
      const session = path.learning_path[0];
      const points = await step(c, "knowledge-explorer", () => exploreKnowledge({ learner_profile: profile, learning_path: path.learning_path, learning_session: session }));
      if (!points) return;
      const draft = await step(c, "knowledge-drafter", () => draftKnowledge({ learner_profile: profile, learning_session: session, knowledge_point: points.knowledge_points[0], use_search: false }));
      if (!draft) return;
      const doc = await step(c, "document-integrator", () =>
        integrateDocument({ learner_profile: profile, learning_path: path.learning_path, learning_session: session, knowledge_points: points.knowledge_points.slice(0, 1), knowledge_drafts: [draft] }),
      );
      if (!doc) return;
      await step(c, "quiz-generator", () => generateQuiz({ learner_profile: profile, learning_document: doc.markdown, single_choice_count: 3, multiple_choice_count: 0, true_false_count: 1, short_answer_count: 0 }));
      await step(c, "feedback-simulator", () => simulateFeedback({ target: "path", learner_profile: profile, learning_path: path.learning_path }));
      await step(c, "profiler-update", () =>
        updateProfile({
          learner_profile: profile,
          learner_interactions: { quiz_performance: { session_title: session.title, total_answered: 4, total_correct: 3, accuracy: 0.75, wrong_questions: [] } },
          session_information: { ...session, if_learned: true },
        }),
      );
      await step(c, "tutor", () => tutorReply({ messages: [{ role: "user", content: c.question }], learner_profile: profile }));
    });
  }
});
