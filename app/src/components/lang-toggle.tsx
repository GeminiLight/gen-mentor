"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGS, useLangStore, useT } from "@/lib/i18n";

/** EN ⇄ 中文. Shows the language you would switch to, the way bilingual sites do. */
export function LangToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { lang, setLang } = useLangStore();
  const { t } = useT();
  const next = LANGS.find((l) => l.value !== lang) ?? LANGS[0];
  return (
    <Button variant="ghost" size={withLabel ? "sm" : "icon"} aria-label={`${t("common.language")}: ${next.native}`} onClick={() => setLang(next.value)} data-testid="lang-toggle" data-lang={lang}>
      <Languages aria-hidden />
      {withLabel && <span className="text-xs">{next.native}</span>}
    </Button>
  );
}
