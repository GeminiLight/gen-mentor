"use client";

/**
 * The learner's own model credentials (bring your own key). Kept in this browser only and
 * sent with each request as one header; the server uses them for that request and forgets them.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Byok } from "@/lib/llm/config";

interface LLMSettings {
  byok: Byok | null;
  setByok: (b: Byok | null) => void;
}

export const useLLMSettings = create<LLMSettings>()(
  persist((set) => ({ byok: null, setByok: (byok) => set({ byok }) }), {
    name: "genmentor.llm.v1",
    storage: createJSONStorage(() => localStorage),
  }),
);

export const maskKey = (key: string) => (key.length <= 8 ? "••••" : `${key.slice(0, 4)}…${key.slice(-4)}`);
