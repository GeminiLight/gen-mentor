"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n";
import type { TutorPanelState } from "./use-tutor-panel";

export function TutorTrigger({ panel, variant }: { panel: TutorPanelState; variant: "rail" | "icon" }) {
  const { t } = useT();
  const props = { "data-tutor-trigger": "", "aria-expanded": panel.open, onClick: (e: React.MouseEvent<HTMLButtonElement>) => panel.show(e.currentTarget) };
  if (variant === "rail") return (
    <button type="button" {...props} className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground">
      <MessageCircle className="size-4" aria-hidden />{t("tutor.open")}
    </button>
  );
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={t("tutor.open")} {...props}><MessageCircle aria-hidden /></Button></TooltipTrigger><TooltipContent>{t("tutor.open")}</TooltipContent></Tooltip>;
}
