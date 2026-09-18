"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n";

export function CommandTrigger({ compact, onOpen }: { compact?: boolean; onOpen: () => void }) {
  const { t } = useT();
  if (compact) return <Tooltip><TooltipTrigger asChild><Button data-command-trigger variant="ghost" size="icon" onClick={onOpen} aria-label={t("command.open")}><Search aria-hidden /></Button></TooltipTrigger><TooltipContent>{t("command.open")}</TooltipContent></Tooltip>;
  return <button data-command-trigger type="button" className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground" onClick={onOpen} aria-label={t("command.open")}>
    <Search className="size-4" aria-hidden />{t("common.search")}<kbd className="ml-auto rounded border bg-muted px-1 font-mono text-xs">⌘ / Ctrl K</kbd>
  </button>;
}
