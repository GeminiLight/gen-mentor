/**
 * The server-side LLM. Routes import from here and never touch an SDK.
 *
 *   LLM_PROVIDER      openai (default) | anthropic
 *   LLM_BASE_URL      custom endpoint; the knob for OpenAI-compatible gateways
 *   LLM_API_KEY       credential; provider-native names still work as fallbacks
 *   LLM_FAST_MODEL    conversation, hints, goal refinement, quizzes
 *   LLM_SMART_MODEL   path scheduling, content generation, evaluation
 *   LLM_OPENAI_TOKEN_PARAM   max_tokens (default) | max_completion_tokens
 *   LLM_OPENAI_THINKING      "disabled" lets `thinking:false` be sent to GLM-style gateways
 *   GENMENTOR_LLM_MODE       live | record | replay   (see replay.ts)
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  anthropicArgs,
  extractJSON,
  jsonCall as coreJsonCall,
  LLMError,
  openaiArgs,
  type ChatOpts,
  type JSONCallOpts,
  type LLM,
  type Provider,
  type TextRun,
  type Tier,
  type TokenParam,
} from "./core";
import { chunked, llmMode, readFixture, writeFixture } from "./replay";

export { extractJSON, LLMError };
export type { ChatOpts, LLM, Tier };

const rawProvider = (process.env.LLM_PROVIDER ?? "openai").trim().toLowerCase();
export const PROVIDER: Provider = rawProvider === "anthropic" ? "anthropic" : "openai";

const BASE_URL =
  process.env.LLM_BASE_URL ||
  (PROVIDER === "openai" ? process.env.OPENAI_BASE_URL : process.env.ANTHROPIC_BASE_URL) ||
  undefined;

const API_KEY =
  process.env.LLM_API_KEY ||
  (PROVIDER === "openai" ? process.env.OPENAI_API_KEY : (process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN));

const OPENAI_TOKEN_PARAM: TokenParam =
  process.env.LLM_OPENAI_TOKEN_PARAM === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens";
const OPENAI_DISABLE_THINKING = process.env.LLM_OPENAI_THINKING === "disabled";

const DEFAULT_MODELS: Record<Provider, Record<Tier, string>> = {
  anthropic: { fast: "claude-sonnet-5", smart: "claude-opus-5" },
  openai: { fast: "glm-5.3-flash", smart: "glm-5.3-flash" },
};

export const MODELS: Record<Tier, string> = {
  fast: process.env.LLM_FAST_MODEL || DEFAULT_MODELS[PROVIDER].fast,
  smart: process.env.LLM_SMART_MODEL || DEFAULT_MODELS[PROVIDER].smart,
};

export const hasServerCredential = () => !!API_KEY;

let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

function requireKey(): string {
  if (API_KEY) return API_KEY;
  throw new LLMError(
    PROVIDER === "openai"
      ? "No OpenAI credential. Set LLM_API_KEY or OPENAI_API_KEY."
      : "No Anthropic credential. Set LLM_API_KEY, ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN.",
    500,
  );
}
function anthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: requireKey(), baseURL: BASE_URL, maxRetries: 2, timeout: 180_000 });
  return _anthropic;
}
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: requireKey(), baseURL: BASE_URL, maxRetries: 2, timeout: 180_000 });
  return _openai;
}

async function liveText(o: ChatOpts, model: string): Promise<string> {
  if (PROVIDER === "openai") {
    const res = await openai().chat.completions.create(
      openaiArgs(o, model, OPENAI_TOKEN_PARAM, OPENAI_DISABLE_THINKING) as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    );
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
  if (PROVIDER === "openai") {
    const stream = await openai().chat.completions.create({
      ...openaiArgs(o, model, OPENAI_TOKEN_PARAM, OPENAI_DISABLE_THINKING),
      stream: true,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming);
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

/** One-shot call. Honors record / replay. */
export async function chatText(o: ChatOpts): Promise<string> {
  const model = MODELS[o.tier];
  const mode = llmMode();
  if (mode === "replay") return readFixture(o, model).text;
  const text = await liveText(o, model);
  if (mode === "record") writeFixture(o, model, text);
  return text;
}

/** Streaming call. In replay the recorded text is re-chunked so the UI path is exercised. */
export function chatStream(o: ChatOpts): TextRun {
  const model = MODELS[o.tier];
  const mode = llmMode();
  let acc = "";
  async function* run(): AsyncGenerator<string> {
    if (mode === "replay") {
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
    if (mode === "record") writeFixture(o, model, acc);
  }
  return { deltas: run(), text: () => acc };
}

export const serverLLM: LLM = { chatText, chatStream };
export const jsonCall = <T>(opts: JSONCallOpts) => coreJsonCall<T>(opts, serverLLM);

/** Prefer the provider's own words: only it knows whether a 429 means "slow down" or "balance empty". */
function providerMessage(e: unknown): string | null {
  const body = (e as { error?: { message?: unknown } } | null)?.error;
  const msg = body && typeof body === "object" ? (body as { message?: unknown }).message : undefined;
  return typeof msg === "string" && msg.trim() ? msg.trim() : null;
}

export function toHttpError(e: unknown): { status: number; message: string } {
  if (e instanceof LLMError) return { status: e.status, message: e.message };
  const provider = providerMessage(e);
  if (e instanceof Anthropic.AuthenticationError || e instanceof OpenAI.AuthenticationError)
    return { status: 401, message: provider ?? "LLM credentials are invalid." };
  if (e instanceof Anthropic.RateLimitError || e instanceof OpenAI.RateLimitError)
    return { status: 429, message: provider ?? "Too many requests to the model. Try again in a moment." };
  if (e instanceof Anthropic.APIConnectionError || e instanceof OpenAI.APIConnectionError)
    return { status: 503, message: `Could not reach the model${BASE_URL ? ` at ${BASE_URL}` : ""}.` };
  if (e instanceof Anthropic.APIError || e instanceof OpenAI.APIError)
    return { status: e.status ?? 502, message: provider ?? e.message };
  return { status: 500, message: e instanceof Error ? e.message : "Unknown error" };
}
