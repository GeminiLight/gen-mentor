import type { Page } from "@playwright/test";
import sample from "../fixtures/agents/sample.json" with { type: "json" };

export const STORAGE_KEY = "genmentor.archive.v1";
export const GOAL_ID = "g_seed";

/**
 * A complete archive built from the sample data, so pages can be screenshotted and
 * audited with real content without running any agent. Session 0 is learned and has a
 * document; session 1 is next.
 */
export function seedArchive() {
  const now = Date.now();
  const path = sample.learning_path.learning_path.map((s, i) => ({ ...s, if_learned: i === 0 }));
  return {
    version: 1 as const,
    exported_at: now,
    active_goal_id: GOAL_ID,
    goals: [
      {
        id: GOAL_ID,
        created_at: now - 3 * 86_400_000,
        original_goal: sample.learning_goal,
        learning_goal: sample.learning_goal,
        learner_information: sample.learner_information,
        skill_requirements: sample.skill_gaps.skill_gaps.map((g) => ({ name: g.name, required_level: g.required_level })),
        skill_gaps: sample.skill_gaps.skill_gaps,
        learner_profile: sample.learner_profile,
        learning_path: path,
        sessions: {
          [`${GOAL_ID}:0`]: {
            opened_at: [now - 2 * 86_400_000, now - 2 * 86_400_000 + 25 * 60_000],
            completed_at: now - 2 * 86_400_000 + 31 * 60_000,
            knowledge_points: sample.knowledge_points,
            knowledge_drafts: sample.knowledge_drafts.map((d) => ({ ...d, sources: [] })),
            document: {
              structure: { title: "Working with Pandas DataFrames", overview: "From creating and inspecting DataFrames to grouping a real sales dataset.", content: "", summary: "Inspect first, then filter, then group." },
              markdown: sample.learning_document,
            },
            quiz: { single_choice_questions: [], multiple_choice_questions: [], true_false_questions: [], short_answer_questions: [] },
            quiz_results: { answered: 3, correct: 2, wrong_questions: [], verdicts: {}, submittedAt: now - 2 * 86_400_000 + 30 * 60_000 },
          },
        },
        mastery_history: [
          { ts: now - 3 * 86_400_000, rate: 0.25, overall_progress: 15 },
          { ts: now - 2 * 86_400_000, rate: 0.25, overall_progress: 28 },
        ],
        tutor: [
          { role: "user" as const, content: "Where should I start this week?" },
          { role: "assistant" as const, content: "Start with Pandas DataFrames: load a CSV with pd.read_csv, then head(), info() and describe()." },
        ],
      },
    ],
  };
}

/** Put the seeded archive into localStorage before the first navigation. zustand persist wraps it. */
export async function seed(page: Page) {
  await page.addInitScript(
    ([key, archive]) => {
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, JSON.stringify({ state: { goals: archive.goals, active_goal_id: archive.active_goal_id }, version: 0 }));
      }
    },
    [STORAGE_KEY, seedArchive()] as const,
  );
}
