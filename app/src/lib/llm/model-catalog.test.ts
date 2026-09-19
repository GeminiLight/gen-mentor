import { afterEach, describe, expect, it, vi } from "vitest";
import { listModels } from "./model-catalog";
import { ModelCatalogRequest } from "../schemas/model-catalog";

const connection = { provider: "openai" as const, apiKey: "sk-test-private" };
afterEach(() => vi.unstubAllGlobals());
describe("model discovery", () => {
  it("uses only supplied credentials, retains proxy paths, and sanitizes/deduplicates models", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: [{ id: "z" }, { id: "a" }, { id: "z" }, { id: "" }, { id: 2 }, { id: "x\n" }, { id: "x".repeat(121) }] }));
    vi.stubGlobal("fetch", fetcher);
    expect(await listModels({ ...connection, baseUrl: "https://gateway.test/proxy/v1/" })).toEqual({ models: [{ id: "a" }, { id: "x" }, { id: "z" }], truncated: false });
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe("https://gateway.test/proxy/v1/models");
    expect(options).toMatchObject({ headers: { Authorization: "Bearer sk-test-private" }, cache: "no-store", redirect: "error" });
  });
  it("loads Anthropic pages with its version and key headers", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: URL, options: RequestInit) => {
      expect(options.headers).toMatchObject({ "x-api-key": connection.apiKey });
      calls.push(url.toString());
      return Response.json(calls.length === 1 ? { data: [{ id: "first", display_name: "First" }], has_more: true, last_id: "first" } : { data: [{ id: "second" }], has_more: false });
    });
    vi.stubGlobal("fetch", fetcher);
    expect((await listModels({ ...connection, provider: "anthropic" })).models).toEqual([{ id: "first", name: "First" }, { id: "second" }]);
    expect(calls).toEqual(["https://api.anthropic.com/v1/models?limit=1000", "https://api.anthropic.com/v1/models?limit=1000&after_id=first"]);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ headers: { "x-api-key": connection.apiKey, "anthropic-version": "2023-06-01" } });
  });
  it.each([[401, "unauthorized"], [403, "unauthorized"], [429, "rateLimited"], [404, "unavailable"], [500, "unavailable"]])("sanitizes upstream %s responses", async (status, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(connection.apiKey, { status: Number(status) })));
    await expect(listModels(connection)).rejects.toThrow(String(code));
  });
  it("sanitizes network failures and invalid catalogs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(connection.apiKey)));
    await expect(listModels(connection)).rejects.toThrow("unavailable");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ unexpected: connection.apiKey })));
    await expect(listModels(connection)).rejects.toThrow("unavailable");
  });
  it("caps pagination and reports incomplete lists", async () => {
    let n = 0;
    const fetcher = vi.fn(async () => Response.json({ data: [{ id: String(++n) }], has_more: true, last_id: String(n) }));
    vi.stubGlobal("fetch", fetcher);
    expect((await listModels({ ...connection, provider: "anthropic" })).truncated).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("rejects invalid protocols and credentials embedded in URLs", () => {
    for (const baseUrl of ["file:///tmp/x", "https://key:secret@example.test/v1", "https://example.test/v1?key=secret", "https://example.test/#secret"]) {
      expect(ModelCatalogRequest.safeParse({ ...connection, baseUrl }).success).toBe(false);
    }
    expect(ModelCatalogRequest.safeParse({ provider: "openai" }).success).toBe(false);
  });
});
