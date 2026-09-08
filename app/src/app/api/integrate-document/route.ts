import { integrateDocument } from "@/lib/agents/knowledge";
import { isResponse, parseBody, taskStream } from "@/lib/api";
import { IntegrateDocumentRequest } from "@/lib/schemas";

export const maxDuration = 180;

/** Streams the integrator's JSON; `@@final` carries `{ structure, markdown }`. */
export async function POST(req: Request) {
  const body = await parseBody(req, IntegrateDocumentRequest);
  if (isResponse(body)) return body;
  return taskStream((onDelta) => integrateDocument(body, onDelta), { final: true });
}
