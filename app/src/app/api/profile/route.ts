import { NextResponse } from "next/server";
import { initializeProfile, updateProfile } from "@/lib/agents/profile";
import { fail, isResponse, parseBody, withRequestLLM } from "@/lib/api";
import { ProfileRequest } from "@/lib/schemas";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await parseBody(req, ProfileRequest);
  if (isResponse(body)) return body;
  try {
    const learner_profile = await withRequestLLM(req, () => (body.mode === "init" ? initializeProfile(body) : updateProfile(body)));
    return NextResponse.json({ learner_profile });
  } catch (e) {
    return fail(e);
  }
}
