/**
 * The portable half of the LLM layer: types, per-provider request shapes and
 * lenient JSON extraction. No SDK imports, no `process.env`, so it is unit-testable
 * and would run identically in a browser.
 */
import { escapeControlCharsInStrings, fixUnescapedQuotes, parsePartialJSON } from "./partial-json";

export type Provider = "anthropic" | "openai";
export type TokenParam = "max_tokens" | "max_completion_tokens";
/** Which model tier a task wants. Routing to a concrete model happens in `index.ts`. */
export type Tier = "fast" | "smart";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOpts {
  tier: Tier;
  system: string;
  messages: ChatMessage[];
  /**
   * Output budget. Reasoning models spend it on thinking before they write a word,
   * so a short budget can come back as an empty string rather than an error.
   * Give structured calls at least a few thousand tokens.
   */
  maxTokens: number;
  /** Reasoning budget where the provider has one. */
  effort?: "low" | "medium" | "high";
  /** false disables extended thinking on providers that support the switch. */
  thinking?: boolean;
}

/** Provider-agnostic streaming run: consume `deltas`, then read `text()`. */
export interface TextRun {
  deltas: AsyncIterable<string>;
  text: () => string;
}

export interface LLM {
  chatText(o: ChatOpts): Promise<string>;
  chatStream(o: ChatOpts): TextRun;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public status = 502,
    public retryable = false,
  ) {
    super(message);
  }
}

export function anthropicArgs(o: ChatOpts, model: string) {
  return {
    model,
    max_tokens: o.maxTokens,
    system: [{ type: "text" as const, text: o.system, cache_control: { type: "ephemeral" as const } }],
    messages: o.messages,
    ...(o.thinking === false ? { thinking: { type: "disabled" as const } } : {}),
    ...(o.effort ? { output_config: { effort: o.effort } } : {}),
  };
}

/**
 * Request body for OpenAI chat completions and anything speaking the same protocol.
 * `disableThinking` is opt-in because GLM-style gateways accept
 * `thinking: {type: "disabled"}` while the official OpenAI endpoint rejects the field.
 */
export function openaiArgs(o: ChatOpts, model: string, tokenParam: TokenParam, disableThinking = false) {
  return {
    model,
    [tokenParam]: o.maxTokens,
    ...(disableThinking && o.thinking === false ? { thinking: { type: "disabled" as const } } : {}),
    messages: [{ role: "system" as const, content: o.system }, ...o.messages],
    ...(o.effort ? { reasoning_effort: o.effort } : {}),
  };
}

/**
 * Drop a ```json fence only when it wraps the document. Drafts legitimately contain
 * ```python fences inside string values; matching those would hand back a code sample.
 */
export function stripLeadingFence(s: string): string {
  const fenceAt = s.indexOf("```");
  const braceAt = Math.min(...["{", "["].map((c) => (s.indexOf(c) === -1 ? Infinity : s.indexOf(c))));
  if (fenceAt === -1 || fenceAt > braceAt) return s;
  const inner = s.slice(fenceAt + 3).replace(/^json/i, "");
  const close = inner.lastIndexOf("```");
  return (close === -1 ? inner : inner.slice(0, close)).trim();
}

/** Slice out the first balanced JSON object or array, skipping fences and prose. */
function isolateJSON(text: string): string {
  let s = stripLeadingFence(text.trim());
  const start = Math.min(...["{", "["].map((c) => (s.indexOf(c) === -1 ? Infinity : s.indexOf(c))));
  if (start === Infinity) throw new LLMError("Model returned no JSON", 502, true);
  s = s.slice(start);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return s.slice(0, i + 1);
    }
  }
  return s;
}

/**
 * Pull JSON out of a model response. The gateway in use does not support structured
 * output formats, so prompts ask for JSON and this parses leniently: fences, prose,
 * trailing commas, raw newlines in strings, unescaped quotes, and a truncated tail.
 */
export function extractJSON<T = unknown>(text: string): T {
  const s = isolateJSON(text);
  const attempts: (() => string)[] = [
    () => s,
    () => s.replace(/,\s*([}\]])/g, "$1"),
    () => escapeControlCharsInStrings(s.replace(/,\s*([}\]])/g, "$1")),
    () => fixUnescapedQuotes(escapeControlCharsInStrings(s.replace(/,\s*([}\]])/g, "$1"))),
  ];
  for (const make of attempts) {
    try {
      return JSON.parse(make()) as T;
    } catch {
      // try the next repair
    }
  }
  const repaired = parsePartialJSON<T>(s);
  if (repaired && Object.keys(repaired).length) return repaired as T;
  throw new LLMError("Model output was not valid JSON", 502, true);
}

export interface JSONCallOpts extends Omit<ChatOpts, "messages"> {
  user: string;
}

/** Non-streaming call that must return JSON. Retries once with a nudge on parse failure. */
export async function jsonCall<T>(opts: JSONCallOpts, llm: LLM): Promise<T> {
  const attempt = async (nudge: boolean): Promise<T> => {
    const text = await llm.chatText({
      ...opts,
      messages: [{ role: "user", content: nudge ? `${opts.user}\n\nReturn ONLY the JSON. No prose.` : opts.user }],
    });
    return extractJSON<T>(text);
  };
  try {
    return await attempt(false);
  } catch (e) {
    if (e instanceof LLMError && e.retryable) return attempt(true);
    throw e;
  }
}
