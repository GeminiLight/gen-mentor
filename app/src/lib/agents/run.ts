/**
 * How every agent talks to the model. Mirrors the Python BaseAgent: one JSON call, and on a
 * schema violation one corrective re-ask that shows the model exactly what failed.
 */
import type { z } from "zod";
import { currentLLM, extractJSON, jsonCall, LLMError, type ChatOpts, type Tier } from "@/lib/llm";
import { fill, type PromptValue } from "@/lib/prompts/format";

export interface AgentCall {
  tier: Tier;
  system: string;
  task: string;
  vars: Record<string, PromptValue>;
  maxTokens?: number;
}

/** Structured calls get a generous budget: reasoning models spend part of it thinking. */
const DEFAULT_JSON_TOKENS = 8000;

export async function runJSON<S extends z.ZodType>(call: AgentCall, schema: S): Promise<z.output<S>> {
  const user = fill(call.task, call.vars);
  const base = { tier: call.tier, system: call.system, maxTokens: call.maxTokens ?? DEFAULT_JSON_TOKENS };
  const first = await jsonCall<unknown>({ ...base, user });
  const parsed = schema.safeParse(first);
  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
  const retry = await currentLLM().chatText({
    ...base,
    messages: [
      { role: "user", content: user },
      { role: "assistant", content: JSON.stringify(first) },
      {
        role: "user",
        content: `Your previous answer violated the output contract:\n${issues}\n\nReturn the corrected JSON only, conforming exactly to the specified format.`,
      },
    ],
  });
  const second = schema.safeParse(extractJSON(retry));
  if (second.success) return second.data;
  throw new LLMError(`Model output failed validation twice: ${issues}`, 502);
}

/**
 * Streaming variant: yields raw text deltas as they arrive, then validates the final text.
 * The client renders the deltas with partial-JSON parsing; the `@@final` payload is the truth.
 */
export function streamJSON<S extends z.ZodType>(call: AgentCall, schema: S, onDelta?: (d: string) => void) {
  const user = fill(call.task, call.vars);
  const opts: ChatOpts = { tier: call.tier, system: call.system, messages: [{ role: "user", content: user }], maxTokens: call.maxTokens ?? DEFAULT_JSON_TOKENS };
  return (async (): Promise<z.output<S>> => {
    const run = currentLLM().chatStream(opts);
    for await (const d of run.deltas) onDelta?.(d);
    const text = run.text();
    let problem: string;
    try {
      const parsed = schema.safeParse(extractJSON(text));
      if (parsed.success) return parsed.data;
      problem = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    } catch (e) {
      if (!(e instanceof LLMError)) throw e;
      problem = e.message;
    }
    // The stream is already on the wire; the corrective re-ask is a plain call whose result becomes @@final.
    const retry = await currentLLM().chatText({
      ...opts,
      messages: [
        { role: "user", content: user },
        { role: "assistant", content: text },
        { role: "user", content: `Your previous answer violated the output contract:\n${problem}\n\nReturn the corrected JSON only, conforming exactly to the specified format.` },
      ],
    });
    const second = schema.safeParse(extractJSON(retry));
    if (second.success) return second.data;
    throw new LLMError(`Model output failed validation twice: ${problem}`, 502);
  })();
}

/** Plain text streaming for conversational agents. */
export async function streamText(call: Omit<AgentCall, "vars" | "task"> & { messages: ChatOpts["messages"] }, onDelta?: (d: string) => void) {
  const run = currentLLM().chatStream({ tier: call.tier, system: call.system, messages: call.messages, maxTokens: call.maxTokens ?? 4000 });
  for await (const d of run.deltas) onDelta?.(d);
  return run.text();
}
