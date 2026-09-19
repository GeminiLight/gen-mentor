import { NextResponse } from "next/server";
import { isResponse, parseBody } from "@/lib/api";
import { CatalogError, listModels } from "@/lib/llm/model-catalog";
import { ModelCatalogRequest } from "@/lib/schemas/model-catalog";

export const maxDuration = 15;

export async function POST(req: Request) {
  const connection = await parseBody(req, ModelCatalogRequest);
  const headers = { "Cache-Control": "no-store" };
  if (isResponse(connection)) return NextResponse.json({ error: "invalidConnection" }, { status: 400, headers });
  try {
    return NextResponse.json(await listModels(connection, req.signal), { headers });
  } catch (error) {
    const failure = error instanceof CatalogError ? error : new CatalogError("unavailable");
    return NextResponse.json({ error: failure.code }, { status: failure.status, headers });
  }
}
