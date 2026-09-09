/**
 * Test double for `@/lib/llm`: answers from a queue, records every request so tests can
 * assert on the rendered prompt, and re-exports the real core helpers.
 */
import { extractJSON, jsonCall as coreJsonCall, LLMError, type ChatOpts, type JSONCallOpts, type LLM, type TextRun } from "@/lib/llm/core";

export const queue: string[] = [];
export const requests: ChatOpts[] = [];

export function reset(...answers: (string | object)[]) {
  queue.length = 0;
  requests.length = 0;
  for (const a of answers) queue.push(typeof a === "string" ? a : JSON.stringify(a));
}

function next(): string {
  const t = queue.shift();
  if (t === undefined) throw new Error("fake LLM queue is empty");
  return t;
}

async function chatText(o: ChatOpts): Promise<string> {
  requests.push(o);
  return next();
}

function chatStream(o: ChatOpts): TextRun {
  requests.push(o);
  const text = next();
  let acc = "";
  async function* run() {
    for (let i = 0; i < text.length; i += 17) {
      const d = text.slice(i, i + 17);
      acc += d;
      yield d;
    }
  }
  return { deltas: run(), text: () => acc };
}

const serverLLM: LLM = { chatText, chatStream };

/** Shape-compatible replacement for the `@/lib/llm` module. */
export const fakeLLMModule = () => ({
  serverLLM,
  currentLLM: () => serverLLM,
  withLLM: <T,>(_llm: LLM, fn: () => T) => fn(),
  llmForRequest: () => ({ llm: serverLLM, source: "server" as const }),
  byokFromRequest: () => null,
  createLLMForConfig: () => serverLLM,
  chatText,
  chatStream,
  extractJSON,
  LLMError,
  jsonCall: <T>(opts: JSONCallOpts) => coreJsonCall<T>(opts, serverLLM),
  MODELS: { fast: "fake-fast", smart: "fake-smart" },
  PROVIDER: "openai" as const,
  hasServerCredential: () => true,
  toHttpError: (e: unknown) => ({ status: 500, message: String(e) }),
});

export const lastUserMessage = () => requests.at(-1)?.messages.at(-1)?.content ?? "";
