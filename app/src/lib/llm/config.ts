/**
 * Where an LLM call goes. The server builds one from environment variables; a learner can
 * supply their own from the browser (BYOK), which travels as request headers and is never
 * stored server-side.
 */
import { z } from "zod";
import type { Provider, Tier, TokenParam } from "./core";

export interface LLMConfig {
  provider: Provider;
  baseUrl?: string;
  apiKey?: string;
  models: Record<Tier, string>;
  tokenParam: TokenParam;
  disableThinking: boolean;
  /** "server" when from env, "byok" when from the learner. */
  source: "server" | "byok";
}

const DEFAULT_MODELS: Record<Provider, Record<Tier, string>> = {
  anthropic: { fast: "claude-sonnet-5", smart: "claude-opus-5" },
  openai: { fast: "glm-5.3-flash", smart: "glm-5.3-flash" },
};

export function serverConfig(): LLMConfig {
  const provider: Provider = (process.env.LLM_PROVIDER ?? "openai").trim().toLowerCase() === "anthropic" ? "anthropic" : "openai";
  return {
    provider,
    baseUrl: process.env.LLM_BASE_URL || (provider === "openai" ? process.env.OPENAI_BASE_URL : process.env.ANTHROPIC_BASE_URL) || undefined,
    apiKey:
      process.env.LLM_API_KEY ||
      (provider === "openai" ? process.env.OPENAI_API_KEY : (process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN)) ||
      undefined,
    models: { fast: process.env.LLM_FAST_MODEL || DEFAULT_MODELS[provider].fast, smart: process.env.LLM_SMART_MODEL || DEFAULT_MODELS[provider].smart },
    tokenParam: process.env.LLM_OPENAI_TOKEN_PARAM === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens",
    disableThinking: process.env.LLM_OPENAI_THINKING === "disabled",
    source: "server",
  };
}

/** What the browser is allowed to send. Everything optional falls back to the server's values. */
export const ByokHeaders = z.object({
  provider: z.enum(["openai", "anthropic"]),
  apiKey: z.string().trim().min(8).max(512),
  baseUrl: z.string().trim().url().optional(),
  fastModel: z.string().trim().min(1).max(120).optional(),
  smartModel: z.string().trim().min(1).max(120).optional(),
  disableThinking: z.boolean().optional(),
});
export type Byok = z.infer<typeof ByokHeaders>;

export const BYOK_HEADER = "x-genmentor-llm";

/** Read a learner's credentials from the request, if they sent any. Invalid headers are ignored. */
export function byokFromRequest(req: Request): LLMConfig | null {
  const raw = req.headers.get(BYOK_HEADER);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const r = ByokHeaders.safeParse(parsed);
  if (!r.success) return null;
  const b = r.data;
  return {
    provider: b.provider,
    baseUrl: b.baseUrl,
    apiKey: b.apiKey,
    models: { fast: b.fastModel || DEFAULT_MODELS[b.provider].fast, smart: b.smartModel || b.fastModel || DEFAULT_MODELS[b.provider].smart },
    tokenParam: "max_tokens",
    disableThinking: b.disableThinking ?? false,
    source: "byok",
  };
}
