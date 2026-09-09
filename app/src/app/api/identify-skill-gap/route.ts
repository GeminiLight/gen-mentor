import { NextResponse } from "next/server";
import { identifySkillGaps } from "@/lib/agents/goal";
import { fail, isResponse, parseBody, withRequestLLM } from "@/lib/api";
import { IdentifySkillGapRequest } from "@/lib/schemas";

export const maxDuration = 120;

/** Maps the goal to skills (unless supplied) and identifies gaps against the learner's background. */
export async function POST(req: Request) {
  const body = await parseBody(req, IdentifySkillGapRequest);
  if (isResponse(body)) return body;
  try {
    return NextResponse.json(await withRequestLLM(req, () => identifySkillGaps(body)));
  } catch (e) {
    return fail(e);
  }
}
