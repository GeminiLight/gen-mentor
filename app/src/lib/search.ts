/**
 * External resources for RAG-style drafting. Tavily returns page content with the search
 * itself, so no crawl step is needed. Without a key, drafts are written from the model's
 * own knowledge and the prompt tells it to skip citation markers.
 *
 * In replay mode nothing is fetched: search text is part of the hashed prompt, so a live
 * search would make recorded fixtures unreachable.
 */
import { llmMode } from "@/lib/llm/replay";
import type { Source } from "@/lib/schemas";

export interface SearchHit {
  title: string;
  url: string;
  content: string;
}

export const searchAvailable = () => !!process.env.TAVILY_API_KEY && llmMode() !== "replay";

export async function webSearch(query: string, maxResults = 5): Promise<SearchHit[]> {
  if (!searchAvailable()) return [];
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify({ query, max_results: maxResults, search_depth: "basic", include_answer: false }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    console.warn("[search] tavily", res.status);
    return [];
  }
  const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (data.results ?? []).map((r) => ({ title: r.title ?? "", url: r.url ?? "", content: r.content ?? "" })).filter((r) => r.url);
}

/** Numbered so the drafter can cite `[N]`; the same indices become `sources`. */
export function formatResources(hits: SearchHit[]): { text: string; sources: Source[] } {
  const text = hits.map((h, i) => `[${i}] ${h.title}\nSource: ${h.url}\n${h.content}`).join("\n\n");
  const sources = hits.map((h, i) => ({ index: i, title: h.title || h.url, source: h.url }));
  return { text, sources };
}
