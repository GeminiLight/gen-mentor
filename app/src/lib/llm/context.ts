/**
 * Per-request LLM selection without threading a parameter through every agent. A route wraps
 * its work in `withLLM`; agents call `currentLLM()`; outside any request the server LLM is used.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { LLM } from "./core";

const store = new AsyncLocalStorage<LLM>();
let fallback: LLM | null = null;

export function setFallbackLLM(llm: LLM) {
  fallback = llm;
}

export function currentLLM(): LLM {
  const llm = store.getStore() ?? fallback;
  if (!llm) throw new Error("No LLM configured");
  return llm;
}

export function withLLM<T>(llm: LLM, fn: () => T): T {
  return store.run(llm, fn);
}
