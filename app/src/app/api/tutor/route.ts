import { tutorReply } from "@/lib/agents/tutor";
import { isResponse, parseBody, taskStream } from "@/lib/api";
import { TutorRequest } from "@/lib/schemas";

export const maxDuration = 60;

/** Plain text stream of the tutor's reply. */
export async function POST(req: Request) {
  const body = await parseBody(req, TutorRequest);
  if (isResponse(body)) return body;
  return taskStream((onDelta) => tutorReply(body, onDelta));
}
