import { NextResponse } from "next/server";
import { exploreKnowledge } from "@/lib/agents/knowledge";
import { fail, isResponse, parseBody } from "@/lib/api";
import { ExploreKnowledgeRequest } from "@/lib/schemas";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await parseBody(req, ExploreKnowledgeRequest);
  if (isResponse(body)) return body;
  try {
    return NextResponse.json(await exploreKnowledge(body));
  } catch (e) {
    return fail(e);
  }
}
