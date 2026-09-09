import { expect, test, type APIRequestContext } from "@playwright/test";
import sample from "../fixtures/agents/sample.json" with { type: "json" };

/**
 * Every agent route, driven with fixed inputs so the LLM fixtures recorded once with
 * GENMENTOR_LLM_MODE=record are hit again in replay. Search is off for the same reason:
 * search text is part of the hashed prompt.
 */
const LEVELS = ["unlearned", "beginner", "intermediate", "advanced"];

async function postJSON<T>(request: APIRequestContext, url: string, data: unknown): Promise<T> {
  const res = await request.post(url, { data, timeout: 420_000 });
  expect(res.ok(), `${url} → ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()) as T;
}

/** Streamed routes: raw deltas, then `@@final` with the validated result. */
async function postStream<T>(request: APIRequestContext, url: string, data: unknown): Promise<{ raw: string; final: T }> {
  const res = await request.post(url, { data, timeout: 420_000 });
  expect(res.ok(), `${url} → ${res.status()}`).toBeTruthy();
  const body = await res.text();
  expect(body, `${url} streamed an error`).not.toContain("@@error");
  const marker = body.lastIndexOf("\n@@final\n");
  expect(marker, `${url} did not send @@final`).toBeGreaterThan(0);
  return { raw: body.slice(0, marker), final: JSON.parse(body.slice(marker + 9)) as T };
}

// The gateway answers in tens of seconds per call, so each test gets a long budget.
test.describe.configure({ timeout: 480_000 });

test("refine-goal", async ({ request }) => {
  const out = await postJSON<{ refined_goal: string }>(request, "/api/refine-goal", {
    learning_goal: sample.learning_goal,
    learner_information: sample.learner_information,
  });
  expect(out.refined_goal.length).toBeGreaterThan(20);
});

test("identify-skill-gap (mapper + identifier)", async ({ request }) => {
  const out = await postJSON<{ skill_gaps: { name: string; is_gap: boolean; current_level: string }[]; skill_requirements: unknown[] }>(
    request,
    "/api/identify-skill-gap",
    { learning_goal: sample.learning_goal, learner_information: sample.learner_information },
  );
  expect(out.skill_requirements.length).toBeGreaterThan(0);
  expect(out.skill_gaps.length).toBeGreaterThan(0);
  for (const g of out.skill_gaps) expect(LEVELS).toContain(g.current_level);
});

test("profile init", async ({ request }) => {
  const init = await postJSON<{ learner_profile: { learning_goal: string; cognitive_status: { overall_progress: number } } }>(request, "/api/profile", {
    mode: "init",
    learning_goal: sample.learning_goal,
    learner_information: sample.learner_information,
    skill_gaps: sample.skill_gaps,
  });
  expect(init.learner_profile.learning_goal.length).toBeGreaterThan(0);
});

test("profile update", async ({ request }) => {
  const upd = await postJSON<{ learner_profile: { cognitive_status: { overall_progress: number } } }>(request, "/api/profile", {
    mode: "update",
    learner_profile: sample.learner_profile,
    learner_interactions: { quiz_performance: { session_title: sample.learning_session.title, total_answered: 3, total_correct: 3, accuracy: 1, wrong_questions: [] } },
    session_information: { ...sample.learning_session, if_learned: true },
  });
  expect(upd.learner_profile.cognitive_status.overall_progress).toBeGreaterThanOrEqual(0);
});

test("schedule-path streams and finalizes", async ({ request }) => {
  const { raw, final } = await postStream<{ learning_path: { id: string; if_learned: boolean }[] }>(request, "/api/schedule-path", {
    task: "create",
    learner_profile: sample.learner_profile,
    session_count: 4,
  });
  expect(raw.length).toBeGreaterThan(50);
  expect(final.learning_path.length).toBeGreaterThan(0);
  expect(final.learning_path.every((s) => s.if_learned === false)).toBe(true);
});

test("explore-knowledge", async ({ request }) => {
  const out = await postJSON<{ knowledge_points: { type: string }[] }>(request, "/api/explore-knowledge", {
    learner_profile: sample.learner_profile,
    learning_path: sample.learning_path,
    learning_session: sample.learning_session,
  });
  expect(out.knowledge_points.length).toBeGreaterThan(0);
  for (const k of out.knowledge_points) expect(["foundational", "practical", "strategic"]).toContain(k.type);
});

test("draft-knowledge streams and finalizes", async ({ request }) => {
  const { final } = await postStream<{ title: string; content: string; sources: unknown[] }>(request, "/api/draft-knowledge", {
    learner_profile: sample.learner_profile,
    learning_session: sample.learning_session,
    knowledge_point: sample.knowledge_points[1],
    use_search: false,
  });
  expect(final.content.length).toBeGreaterThan(100);
  expect(final.sources).toEqual([]);
});

test("integrate-document streams and finalizes with markdown", async ({ request }) => {
  const { final } = await postStream<{ structure: { title: string }; markdown: string }>(request, "/api/integrate-document", {
    learner_profile: sample.learner_profile,
    learning_path: sample.learning_path,
    learning_session: sample.learning_session,
    knowledge_points: sample.knowledge_points,
    knowledge_drafts: sample.knowledge_drafts,
  });
  expect(final.markdown).toContain(`# ${final.structure.title}`);
  expect(final.markdown).toContain("## Summary");
});

test("generate-quiz", async ({ request }) => {
  const out = await postJSON<{ document_quiz: { single_choice_questions: { options: string[] }[] } }>(request, "/api/generate-quiz", {
    learner_profile: sample.learner_profile,
    learning_document: sample.learning_document,
    single_choice_count: 3,
  });
  expect(out.document_quiz.single_choice_questions.length).toBeGreaterThan(0);
});

test("simulate-feedback", async ({ request }) => {
  const out = await postJSON<{ feedback: { progression: string }; suggestions: { engagement: string } }>(request, "/api/simulate-feedback", {
    target: "path",
    learner_profile: sample.learner_profile,
    learning_path: sample.learning_path,
  });
  expect(out.feedback.progression.length).toBeGreaterThan(0);
});

test("tutor streams plain text", async ({ request }) => {
  const res = await request.post("/api/tutor", { data: { messages: sample.messages, learner_profile: sample.learner_profile }, timeout: 420_000 });
  expect(res.ok()).toBeTruthy();
  const text = await res.text();
  expect(text).not.toContain("@@error");
  expect(text).toMatch(/loc|iloc/);
});

test("invalid bodies are rejected with 400 before any model call", async ({ request }) => {
  const res = await request.post("/api/refine-goal", { data: { learning_goal: "" } });
  expect(res.status()).toBe(400);
  expect(await res.json()).toHaveProperty("issues");
});
