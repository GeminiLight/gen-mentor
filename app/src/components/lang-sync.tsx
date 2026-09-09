"use client";

import { useHtmlLang } from "@/lib/i18n";

/** Mounted once in the root layout; keeps <html lang> equal to the chosen UI language. */
export function LangSync() {
  useHtmlLang();
  return null;
}
