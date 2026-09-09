import type { SessionItem } from "@/lib/schemas";
import type { Goal } from "./types";
import { sessionUid } from "./derive";

/** A new position may reuse content only when the lesson itself is unchanged. */
const fingerprint = ({ title, abstract, associated_skills, desired_outcome_when_completed }: SessionItem) =>
  JSON.stringify([title, abstract, associated_skills, desired_outcome_when_completed]);

export function reconcilePath(goal: Goal, path: SessionItem[]): Pick<Goal, "learning_path" | "sessions"> {
  const remaining = new Set(goal.learning_path.map((_, i) => i));
  const sessions: Goal["sessions"] = {};
  const learning_path = path.map((item, index) => {
    const match = [...remaining].find((i) => fingerprint(goal.learning_path[i]) === fingerprint(item));
    if (match === undefined) return { ...item, if_learned: false };
    remaining.delete(match);
    const previous = goal.learning_path[match];
    const state = goal.sessions[sessionUid(goal.id, match)];
    if (state) sessions[sessionUid(goal.id, index)] = state;
    return { ...item, if_learned: previous.if_learned };
  });
  if ([...remaining].some((i) => goal.learning_path[i].if_learned)) {
    throw new Error("The new path changed a completed session. Your original path is preserved.");
  }
  return { learning_path, sessions };
}
