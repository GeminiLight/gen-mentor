"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LANGS, useLangStore, useT } from "@/lib/i18n";

/** EN ⇄ 中文. Shows the language you would switch to, the way bilingual sites do. */
export function LangToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { lang, setLang } = useLangStore();
  const { t } = useT();
  const next = LANGS.find((l) => l.value !== lang) ?? LANGS[0];
  const label = `${t("common.language")}: ${next.native}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size={withLabel ? "sm" : "icon"} aria-label={label} onClick={() => setLang(next.value)} data-testid="lang-toggle" data-lang={lang}>
          <Languages aria-hidden />
          {withLabel && <span className="text-xs">{next.native}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{next.native}</TooltipContent>
    </Tooltip>
  );
}
