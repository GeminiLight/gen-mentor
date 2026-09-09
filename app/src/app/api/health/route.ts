import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api";
import { byokFromRequest, createLLM, hasServerCredential, MODELS, PROVIDER } from "@/lib/llm";
import { llmMode } from "@/lib/llm/replay";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Booleans and model names only, never any part of a credential. */
export function GET(req: Request) {
  const byok = byokFromRequest(req);
  return NextResponse.json(
    {
      ok: true,
      provider: byok?.provider ?? PROVIDER,
      serverKey: hasServerCredential(),
      source: byok ? "byok" : "server",
      mode: llmMode(),
      models: byok?.models ?? MODELS,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const Empty = z.object({}).passthrough();

/** Test a learner's credentials with one tiny live call. Nothing is stored. */
export async function POST(req: Request) {
  const body = Empty.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const byok = byokFromRequest(req);
  if (!byok) return NextResponse.json({ error: "Send credentials in the x-genmentor-llm header." }, { status: 400 });
  const t0 = Date.now();
  try {
    const reply = await createLLM(byok).chatText({ tier: "fast", system: "Reply with exactly: pong", messages: [{ role: "user", content: "ping" }], maxTokens: 64, thinking: false });
    return NextResponse.json({ ok: true, reply: reply.trim().slice(0, 80), ms: Date.now() - t0, model: byok.models.fast });
  } catch (e) {
    return fail(e);
  }
}
