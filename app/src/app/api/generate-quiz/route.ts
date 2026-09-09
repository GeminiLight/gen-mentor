import { NextResponse } from "next/server";
import { generateQuiz } from "@/lib/agents/quiz";
import { fail, isResponse, parseBody, withRequestLLM } from "@/lib/api";
import { GenerateQuizRequest } from "@/lib/schemas";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await parseBody(req, GenerateQuizRequest);
  if (isResponse(body)) return body;
  try {
    return NextResponse.json({ document_quiz: await withRequestLLM(req, () => generateQuiz(body)) });
  } catch (e) {
    return fail(e);
  }
}
