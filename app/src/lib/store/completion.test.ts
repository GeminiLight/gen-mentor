import { beforeEach, expect, it, vi } from "vitest";
import sample from "../../../../e2e/fixtures/agents/sample.json";
import { LearnerProfile, LearningPath } from "@/lib/schemas";
import { api } from "@/lib/client";
import { useArchive } from "./index";
import { completeSession, refreshProfiles, useProfileActivity } from "./completion";
import { ArchiveSchema } from "@/lib/schemas/archive";
import type { Goal, QuizResults } from "./types";

vi.mock("@/lib/client", () => ({ api: { profile: vi.fn() } }));
vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
});
const profile = LearnerProfile.parse(sample.learner_profile);
const path = LearningPath.parse(sample.learning_path).learning_path;
const results: QuizResults = { answered: 1, correct: 1, wrong_questions: [], verdicts: { "single:0": "correct" }, submittedAt: 100 };
const makeGoal = (): Goal => ({
  id: "g", created_at: 1, original_goal: sample.learning_goal, learning_goal: sample.learning_goal,
  learner_information: sample.learner_information, skill_requirements: [], skill_gaps: [],
  learner_profile: structuredClone(profile), learning_path: structuredClone(path),
  sessions: { "g:0": { opened_at: [100], quiz_results: results }, "g:1": { opened_at: [200], quiz_results: results } },
  mastery_history: [], tutor: [],
});
const current = () => useArchive.getState().goals[0];
beforeEach(() => {
  useArchive.setState({ goals: [makeGoal()], active_goal_id: "g" });
  useProfileActivity.setState({ running: {} });
  vi.mocked(api.profile).mockReset();
});

it("saves completion once before any model request and preserves the assessment in exports", () => {
  completeSession("g", 0);
  const first = structuredClone(current());
  completeSession("g", 0);
  expect(current()).toEqual(first);
  expect(current().learning_path[0].if_learned).toBe(true);
  expect(current().sessions["g:0"].completed_at).toBeGreaterThan(0);
  expect(current().mastery_history).toEqual([]);
  expect(api.profile).not.toHaveBeenCalled();
  expect(ArchiveSchema.parse(useArchive.getState().exportArchive()).goals[0].sessions["g:0"].profile_update?.evidence).toEqual(results);
});

it("model failure keeps completion and retry updates the estimate exactly once", async () => {
  completeSession("g", 0);
  const completed = current().sessions["g:0"].completed_at;
  vi.mocked(api.profile).mockRejectedValueOnce(new Error("offline"));
  await refreshProfiles("g");
  expect(current().learning_path[0].if_learned).toBe(true);
  expect(current().sessions["g:0"].profile_update?.status).toBe("failed");
  vi.mocked(api.profile).mockResolvedValue({ learner_profile: profile });
  await refreshProfiles("g", true);
  await refreshProfiles("g", true);
  expect(api.profile).toHaveBeenCalledTimes(2);
  expect(current().sessions["g:0"].completed_at).toBe(completed);
  expect(current().sessions["g:0"].profile_update).toBeUndefined();
  expect(current().mastery_history).toHaveLength(1);
});

it("serializes simultaneous completions and evaluates against the newest profile", async () => {
  completeSession("g", 0);
  let resolve!: (value: { learner_profile: Goal["learner_profile"] }) => void;
  const first = { ...profile, learner_information: "first assessment" };
  vi.mocked(api.profile).mockImplementationOnce(() => new Promise((r) => { resolve = r; })).mockResolvedValue({ learner_profile: profile });
  const pending = refreshProfiles("g");
  completeSession("g", 1);
  await refreshProfiles("g");
  expect(api.profile).toHaveBeenCalledTimes(1);
  resolve({ learner_profile: first });
  await pending;
  const request = vi.mocked(api.profile).mock.calls[1][0];
  expect(request.mode === "update" && request.learner_profile).toEqual(first);
  expect(current().mastery_history).toHaveLength(2);
});

it("does not overwrite a newer manual profile edit", async () => {
  completeSession("g", 0);
  vi.mocked(api.profile).mockImplementation(async () => {
    useArchive.getState().updateGoal("g", { learner_profile: { ...profile, learner_information: "new manual edit" } });
    return { learner_profile: profile };
  });
  await refreshProfiles("g");
  expect(current().learner_profile.learner_information).toBe("new manual edit");
  expect(current().mastery_history).toHaveLength(0);
  expect(current().sessions["g:0"].profile_update?.status).toBe("failed");
});

it("ignores a deleted goal and does not recreate it after a late response", async () => {
  completeSession("g", 0);
  vi.mocked(api.profile).mockImplementation(async () => {
    useArchive.getState().removeGoal("g");
    return { learner_profile: profile };
  });
  await refreshProfiles("g");
  expect(useArchive.getState().goals).toEqual([]);
});

it("completion without answers records activity without inventing skill evidence", async () => {
  useArchive.getState().patchSession("g:0", { quiz_results: undefined });
  completeSession("g", 0);
  await refreshProfiles("g");
  expect(current().learning_path[0].if_learned).toBe(true);
  expect(current().mastery_history).toEqual([]);
  expect(api.profile).not.toHaveBeenCalled();
});

it("a reordered lesson receives its own delayed assessment by task identity", async () => {
  completeSession("g", 0);
  vi.mocked(api.profile).mockImplementation(async () => {
    useArchive.getState().updateGoal("g", (g) => ({
      learning_path: [g.learning_path[1], g.learning_path[0], ...g.learning_path.slice(2)],
      sessions: { "g:1": g.sessions["g:0"], "g:0": g.sessions["g:1"] },
    }));
    return { learner_profile: profile };
  });
  await refreshProfiles("g");
  expect(current().sessions["g:1"].profile_update).toBeUndefined();
  expect(current().learning_path[1].if_learned).toBe(true);
  expect(current().mastery_history).toHaveLength(1);
});
