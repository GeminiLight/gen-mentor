import { NextResponse } from "next/server";
import { hasServerCredential, MODELS, PROVIDER } from "@/lib/llm";
import { llmMode } from "@/lib/llm/replay";

export const dynamic = "force-dynamic";

/** Booleans and model names only, never any part of a credential. */
export function GET() {
  return NextResponse.json(
    { ok: true, provider: PROVIDER, serverKey: hasServerCredential(), mode: llmMode(), models: MODELS },
    { headers: { "Cache-Control": "no-store" } },
  );
}
