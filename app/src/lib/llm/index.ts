/**
 * The server-side LLM. Routes import from here and never touch an SDK.
 *
 * `createLLM(config)` builds a client for any config; `serverLLM` is the one from the
 * environment. Learners can bring their own key: a route reads it from the request and runs
 * its work under `withLLM`, so agents pick it up through `currentLLM()`.
 *
 *   GENMENTOR_LLM_MODE   live | record | replay   (see replay.ts)
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { byokFromRequest, serverConfig, type LLMConfig } from "./config";
import { currentLLM, setFallbackLLM, withLLM } from "./context";
import {
  anthropicArgs,
  extractJSON,
  jsonCall as coreJsonCall,
  LLMError,
  openaiArgs,
  type ChatOpts,
  type JSONCallOpts,
  type LLM,
  type TextRun,
  type Tier,
} from "./core";
import { chunked, llmMode, readFixture, writeFixture } from "./replay";

export { extractJSON, LLMError, currentLLM, withLLM, byokFromRequest };
export { createLLM as createLLMForConfig };
export type { ChatOpts, LLM, Tier, LLMConfig };

const SERVER = serverConfig();
export const PROVIDER = SERVER.provider;
export const MODELS = SERVER.models;
export const hasServerCredential = () => !!SERVER.apiKey;

/**
 * The fast tier is for short, well-specified tasks; extended thinking there only adds latency
 * (measured on the GLM gateway: 30s → 18s for the same answer). Callers can still opt in.
 */
const withTierDefaults = (o: ChatOpts): ChatOpts => (o.tier === "fast" && o.thinking === undefined ? { ...o, thinking: false } : o);

function requireKey(cfg: LLMConfig): string {
  if (cfg.apiKey) return cfg.apiKey;
  throw new LLMError(
    cfg.provider === "openai" ? "No OpenAI credential. Set LLM_API_KEY or add your own key in Settings." : "No Anthropic credential. Set LLM_API_KEY or add your own key in Settings.",
    500,
  );
}

export function createLLM(cfg: LLMConfig): LLM {
  let _anthropic: Anthropic | null = null;
  let _openai: OpenAI | null = null;
  const anthropic = () => (_anthropic ??= new Anthropic({ apiKey: requireKey(cfg), baseURL: cfg.baseUrl, maxRetries: 2, timeout: 180_000 }));
  const openai = () => (_openai ??= new OpenAI({ apiKey: requireKey(cfg), baseURL: cfg.baseUrl, maxRetries: 2, timeout: 180_000 }));

  async function liveText(o: ChatOpts, model: string): Promise<string> {
    if (cfg.provider === "openai") {
      const res = await openai().chat.completions.create(openaiArgs(o, model, cfg.tokenParam, cfg.disableThinking) as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
      const choice = res.choices[0];
      if (choice?.message?.refusal) throw new LLMError("The model declined this request.", 422);
      return choice?.message?.content ?? "";
    }
    const res = await anthropic().messages.create(anthropicArgs(o, model));
    if (res.stop_reason === "refusal") throw new LLMError("The model declined this request.", 422);
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }

  async function* liveDeltas(o: ChatOpts, model: string): AsyncGenerator<string> {
    if (cfg.provider === "openai") {
      const stream = await openai().chat.completions.create({ ...openaiArgs(o, model, cfg.tokenParam, cfg.disableThinking), stream: true } as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming);
      for await (const chunk of stream) {
        const d = chunk.choices[0]?.delta?.content;
        if (d) yield d;
      }
      return;
    }
    const stream = anthropic().messages.stream(anthropicArgs(o, model));
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) yield ev.delta.text;
    }
  }

  // Record / replay only applies to the server's own configuration; a learner's key is always live.
  const mode = () => (cfg.source === "server" ? llmMode() : "live");

  return {
    async chatText(input) {
      const o = withTierDefaults(input);
      const model = cfg.models[o.tier];
      if (mode() === "replay") return readFixture(o, model).text;
      const text = await liveText(o, model);
      if (mode() === "record") writeFixture(o, model, text);
      return text;
    },
    chatStream(input): TextRun {
      const o = withTierDefaults(input);
      const model = cfg.models[o.tier];
      let acc = "";
      async function* run(): AsyncGenerator<string> {
        if (mode() === "replay") {
          for await (const d of chunked(readFixture(o, model).text)) {
            acc += d;
            yield d;
          }
          return;
        }
        for await (const d of liveDeltas(o, model)) {
          acc += d;
          yield d;
        }
        if (mode() === "record") writeFixture(o, model, acc);
      }
      return { deltas: run(), text: () => acc };
    },
  };
}

export const serverLLM: LLM = createLLM(SERVER);
setFallbackLLM(serverLLM);

/** The LLM a request should use: the learner's own key when they sent one, else the server's. */
export function llmForRequest(req: Request): { llm: LLM; source: LLMConfig["source"] } {
  const byok = byokFromRequest(req);
  return byok ? { llm: createLLM(byok), source: "byok" } : { llm: serverLLM, source: "server" };
}

/** `jsonCall` bound to whichever LLM the current request selected. */
export const jsonCall = <T>(opts: JSONCallOpts) => coreJsonCall<T>(opts, currentLLM());

/** Prefer the provider's own words: only it knows whether a 429 means "slow down" or "balance empty". */
function providerMessage(e: unknown): string | null {
  const body = (e as { error?: { message?: unknown } } | null)?.error;
  const msg = body && typeof body === "object" ? (body as { message?: unknown }).message : undefined;
  return typeof msg === "string" && msg.trim() ? msg.trim() : null;
}

export function toHttpError(e: unknown): { status: number; message: string } {
  if (e instanceof LLMError) return { status: e.status, message: e.message };
  const provider = providerMessage(e);
  if (e instanceof Anthropic.AuthenticationError || e instanceof OpenAI.AuthenticationError) return { status: 401, message: provider ?? "LLM credentials are invalid." };
  if (e instanceof Anthropic.RateLimitError || e instanceof OpenAI.RateLimitError) return { status: 429, message: provider ?? "Too many requests to the model. Try again in a moment." };
  if (e instanceof Anthropic.APIConnectionError || e instanceof OpenAI.APIConnectionError) return { status: 503, message: "Could not reach the model endpoint." };
  if (e instanceof Anthropic.APIError || e instanceof OpenAI.APIError) return { status: e.status ?? 502, message: provider ?? e.message };
  return { status: 500, message: e instanceof Error ? e.message : "Unknown error" };
}
