"use client";

/**
 * Two UI languages, one dictionary shape. The choice is per device (zustand persist) and
 * defaults to the browser language on first visit. Agent output follows the learner's own
 * language; this layer only covers the product's chrome.
 */
import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { en, type Dict } from "./en";
import { zh } from "./zh";

export type Lang = "en" | "zh";
export const LANGS: { value: Lang; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "zh", label: "Chinese", native: "中文" },
];
const DICTS: Record<Lang, Dict> = { en, zh };

const detect = (): Lang => (typeof navigator !== "undefined" && /^zh\b/i.test(navigator.language) ? "zh" : "en");

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist((set) => ({ lang: "en", setLang: (lang) => set({ lang }) }), {
    name: "genmentor.lang.v1",
    storage: createJSONStorage(() => localStorage),
    merge: (persisted, current) => ({ ...current, ...(persisted as Partial<LangState>), lang: (persisted as Partial<LangState> | undefined)?.lang ?? detect() }),
  }),
);

type Leaves<T, P extends string = ""> = T extends string ? P : { [K in keyof T & string]: Leaves<T[K], P extends "" ? K : `${P}.${K}`> }[keyof T & string];
export type Key = Leaves<Dict>;

function lookup(dict: Dict, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const raw = lookup(DICTS[lang], key) ?? lookup(en, key) ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : raw;
}

/** `t("path.title")` plus locale-aware formatters. Re-renders when the language changes. */
export function useT() {
  const lang = useLangStore((s) => s.lang);
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  return {
    lang,
    t: (key: Key, vars?: Vars) => translate(lang, key, vars),
    fmtDate: (ts: number, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) => new Date(ts).toLocaleString(locale, opts),
    fmtNum: (n: number) => n.toLocaleString(locale),
  };
}

/** Keeps `<html lang>` in step with the chosen language for screen readers and hyphenation. */
export function useHtmlLang() {
  const lang = useLangStore((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);
}
