import { NextResponse } from "next/server";
import { simulateFeedback } from "@/lib/agents/feedback";
import { fail, isResponse, parseBody } from "@/lib/api";
import { SimulateFeedbackRequest } from "@/lib/schemas";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await parseBody(req, SimulateFeedbackRequest);
  if (isResponse(body)) return body;
  try {
    return NextResponse.json(await simulateFeedback(body));
  } catch (e) {
    return fail(e);
  }
}
