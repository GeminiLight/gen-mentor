"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { ModelCatalogRequest, type ModelCatalogData } from "@/lib/schemas/model-catalog";
import type { Byok } from "@/lib/llm/config";

export function useModelCatalog(connection: Byok) {
  const [data, setData] = useState<ModelCatalogData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<"catalogFailed" | "catalogUnauthorized" | "catalogRateLimited">("catalogFailed");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const parsed = ModelCatalogRequest.safeParse({ provider: connection.provider, apiKey: connection.apiKey, baseUrl: connection.baseUrl || undefined });
  const load = async (refresh = false) => {
    if (!parsed.success || request.current || (data && !refresh)) return;
    const controller = new AbortController();
    request.current = controller;
    setStatus("loading");
    try {
      const result = await api.models(parsed.data, controller.signal);
      if (controller.signal.aborted) return;
      setData(result);
      setStatus("ready");
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof ApiError && e.status === 401 ? "catalogUnauthorized" : e instanceof ApiError && e.status === 429 ? "catalogRateLimited" : "catalogFailed");
      setStatus("error");
    } finally {
      if (request.current === controller) request.current = null;
    }
  };
  return { data, status, error, valid: parsed.success, load };
}
