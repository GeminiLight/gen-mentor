import { schedulePath } from "@/lib/agents/path";
import { isResponse, parseBody, taskStream } from "@/lib/api";
import { SchedulePathRequest } from "@/lib/schemas";

export const maxDuration = 180;

/** Streams the model's JSON as it is written; the validated path arrives as `@@final`. */
export async function POST(req: Request) {
  const body = await parseBody(req, SchedulePathRequest);
  if (isResponse(body)) return body;
  return taskStream((onDelta) => schedulePath(body, onDelta), { final: true });
}
