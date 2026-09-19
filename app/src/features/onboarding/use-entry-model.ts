"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { useLLMSettings } from "@/lib/store/llm-settings";

/** Configuration readiness is not a claim that credentials have been verified. */
export function useEntryModel() {
  const byok = useLLMSettings((s) => s.byok);
  const [server, setServer] = useState<"loading" | "ready" | "missing" | "offline">("loading");
  const generation = useRef(0);
  const check = useCallback(async () => {
    const run = ++generation.current;
    try {
      const health = await api.health();
      const state = health.serverKey || health.mode === "replay" ? "ready" : "missing";
      if (run === generation.current) setServer(state);
      return state;
    } catch {
      if (run === generation.current) setServer("offline");
      return "offline" as const;
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    const lifetime = generation;
    void Promise.resolve().then(() => { if (mounted) void check(); });
    return () => { mounted = false; lifetime.current++; };
  }, [check]);
  return { state: byok ? "ready" as const : server, check };
}
