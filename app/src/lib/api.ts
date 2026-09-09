/** Shared plumbing for route handlers: body validation, error shaping, text streaming. */
import { NextResponse } from "next/server";
import type { z } from "zod";
import { toHttpError } from "./llm";

export function fail(e: unknown) {
  const { status, message } = toHttpError(e);
  console.error("[api]", status, message);
  return NextResponse.json({ error: message }, { status });
}

/** Parse and validate a JSON body. Returns a 400 response instead of a value when invalid. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S> | NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request", issues: result.error.issues }, { status: 400 });
  }
  return result.data;
}

export const isResponse = (v: unknown): v is NextResponse => v instanceof Response;

/**
 * Run a streaming task and return its deltas as plain text. With `final`, the resolved
 * value is appended as `\n@@final\n<json>`; failures mid-stream are appended as
 * `\n@@error\n<message>` because headers have already gone out.
 */
export function taskStream<T>(run: (onDelta: (d: string) => void) => Promise<T>, opts: { final?: boolean } = {}) {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await run((d) => controller.enqueue(enc.encode(d)));
        if (opts.final) controller.enqueue(enc.encode(`\n@@final\n${JSON.stringify(result)}`));
      } catch (e) {
        const { status, message } = toHttpError(e);
        console.error("[api]", status, message);
        controller.enqueue(enc.encode(`\n@@error\n${message}`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
