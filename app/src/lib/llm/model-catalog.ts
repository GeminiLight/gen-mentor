import type { ModelCatalogData, ModelConnection } from "../schemas/model-catalog";

export class CatalogError extends Error {
  constructor(public code: "unavailable" | "unauthorized" | "rateLimited", public status = 502) {
    super(code);
  }
}

/** Metadata only. Never uses server credentials or follows authenticated redirects. */
export async function listModels(connection: ModelConnection, signal?: AbortSignal): Promise<ModelCatalogData> {
  const anthropic = connection.provider === "anthropic";
  const base = (connection.baseUrl || (anthropic ? "https://api.anthropic.com" : "https://api.openai.com/v1")).replace(/\/+$/, "");
  // Anthropic's SDK base URL is the API root; custom roots may include a proxy prefix.
  const url = new URL(`${base}${anthropic ? "/v1/models" : "/models"}`);
  if (anthropic) url.searchParams.set("limit", "1000");
  const headers: Record<string, string> = anthropic
    ? { "x-api-key": connection.apiKey, "anthropic-version": "2023-06-01" }
    : { Authorization: `Bearer ${connection.apiKey}` };
  const timeout = AbortSignal.timeout(10_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const models = new Map<string, ModelCatalogData["models"][number]>();
  let truncated = false;
  try {
    for (let page = 0; page < 3; page++) {
      const response = await fetch(url, { headers, signal: requestSignal, cache: "no-store", redirect: "error" });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new CatalogError("unauthorized", 401);
        if (response.status === 429) throw new CatalogError("rateLimited", 429);
        throw new CatalogError("unavailable");
      }
      const body = await response.json();
      if (!body || !Array.isArray(body.data)) throw new CatalogError("unavailable");
      for (const item of body.data.slice(0, 3000)) {
        if (typeof item?.id !== "string") continue;
        const id = item.id.trim();
        if (!id || id.length > 120 || /[\u0000-\u001f\u007f]/.test(id)) continue;
        const name = typeof item.display_name === "string" ? item.display_name.slice(0, 200) : undefined;
        models.set(id, { id, ...(name ? { name } : {}) });
        if (models.size >= 3000) break;
      }
      truncated = body.data.length > 3000 || body.has_more === true;
      if (!truncated || !anthropic || models.size >= 3000) break;
      if (typeof body.last_id !== "string" || !body.last_id || body.last_id === url.searchParams.get("after_id")) break;
      url.searchParams.set("after_id", body.last_id);
    }
    return { models: [...models.values()].sort((a, b) => a.id.localeCompare(b.id)), truncated };
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    // Upstream bodies/URLs may contain credentials; never expose or log them.
    throw new CatalogError("unavailable");
  }
}
