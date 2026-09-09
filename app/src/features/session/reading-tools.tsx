"use client";

import { Download, Ellipsis } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { RegenerateButton } from "./regenerate-button";

export function ReadingTools({ markdown, disabled, onRegenerate }: { markdown: string; disabled: boolean; onRegenerate: () => void }) {
  const { t } = useT();
  const menu = useRef<HTMLDetailsElement>(null);
  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "genmentor-reading.md";
    a.click();
    URL.revokeObjectURL(url);
    menu.current?.removeAttribute("open");
  };
  return (
    <details ref={menu} className="relative">
      <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={t("polish.more")}><Ellipsis className="size-5" aria-hidden /></summary>
      <div className="absolute right-0 z-30 mt-2 flex w-(--w-toc) flex-col items-stretch gap-1 rounded-lg border bg-popover p-2 shadow-sm">
        <Button variant="ghost" size="sm" onClick={download} className="justify-start"><Download aria-hidden />{t("polish.downloadDocument")}</Button>
        <RegenerateButton disabled={disabled} onConfirm={() => { menu.current?.removeAttribute("open"); onRegenerate(); }} />
      </div>
    </details>
  );
}
