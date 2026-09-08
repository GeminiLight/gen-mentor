import { draftKnowledge } from "@/lib/agents/knowledge";
import { isResponse, parseBody, taskStream } from "@/lib/api";
import { DraftKnowledgeRequest } from "@/lib/schemas";

export const maxDuration = 180;

/** Streams the draft JSON; `@@final` carries the validated draft plus its numbered sources. */
export async function POST(req: Request) {
  const body = await parseBody(req, DraftKnowledgeRequest);
  if (isResponse(body)) return body;
  return taskStream((onDelta) => draftKnowledge(body, onDelta), { final: true });
}
