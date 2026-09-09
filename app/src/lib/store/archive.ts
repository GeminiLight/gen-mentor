/** Import / export of the whole archive as a JSON file. Validation is structural, not deep. */
import type { Archive } from "./types";

export function archiveToBlob(archive: Archive): Blob {
  return new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
}

export function archiveFileName(archive: Archive): string {
  return `genmentor-archive-${new Date(archive.exported_at).toISOString().slice(0, 10)}.json`;
}

export function parseArchive(text: string): Archive {
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== "object") throw new Error("Not a GenMentor archive");
  const a = data as Partial<Archive>;
  if (a.version !== 1 || !Array.isArray(a.goals)) throw new Error("Unsupported archive version");
  for (const g of a.goals) {
    if (!g || typeof g !== "object" || typeof g.id !== "string" || !g.learner_profile || !Array.isArray(g.learning_path)) {
      throw new Error("Archive contains a malformed goal");
    }
  }
  return { version: 1, exported_at: a.exported_at ?? Date.now(), active_goal_id: a.active_goal_id ?? null, goals: a.goals };
}
