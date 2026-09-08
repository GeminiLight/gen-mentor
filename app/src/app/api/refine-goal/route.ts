import { NextResponse } from "next/server";
import { refineGoal } from "@/lib/agents/goal";
import { fail, isResponse, parseBody } from "@/lib/api";
import { RefineGoalRequest } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await parseBody(req, RefineGoalRequest);
  if (isResponse(body)) return body;
  try {
    return NextResponse.json(await refineGoal(body));
  } catch (e) {
    return fail(e);
  }
}
