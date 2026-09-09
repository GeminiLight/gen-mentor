"use client";

import { Pin, PinOff, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n";
import type { SessionItem } from "@/lib/schemas";
import { useArchive, type Goal } from "@/lib/store";
import { ClearConversation } from "./clear-conversation";
import { TutorConversation } from "./tutor-conversation";
import { useTutorConversation } from "./use-tutor-conversation";
import type { TutorPanelState } from "./use-tutor-panel";

export function TutorSheet({ goal, session, context, panel }: { goal: Goal; session?: SessionItem; context?: string; panel: TutorPanelState }) {
  const { t } = useT();
  const clearTutor = useArchive((s) => s.clearTutor);
  const conversation = useTutorConversation(goal, session, context);
  const dock = useRef<HTMLElement>(null);
  useEffect(() => {
    if (panel.docked) dock.current?.querySelector("textarea")?.focus({ preventScroll: true });
  }, [panel.docked]);
  const Title = panel.docked ? "h2" : SheetTitle;
  const Description = panel.docked ? "p" : SheetDescription;
  const content = <>
    <header className="shrink-0 space-y-3 border-b p-4">
      <div className="flex items-center justify-between gap-2">
        <Title className="text-base font-medium">{t("tutor.title")}</Title>
        <div className="flex items-center gap-1">
          {goal.tutor.length > 0 && <ClearConversation onClear={() => clearTutor(goal.id)} disabled={conversation.pending !== null} />}
          <Button variant="ghost" size="icon-sm" aria-label={t("polish.close")} onClick={panel.close}><X aria-hidden /></Button>
        </div>
      </div>
      <Description className="text-sm text-muted-foreground">{t("tutor.lede", { context: context ? t("tutor.ledeContext") : "" })}</Description>
      {panel.wide && <Button variant="outline" size="sm" className="w-full justify-start" aria-pressed={panel.docked} onClick={panel.togglePin}>
        {panel.docked ? <PinOff aria-hidden /> : <Pin aria-hidden />}
        {t(panel.docked ? "tutor.unpin" : "tutor.pin")}
      </Button>}
    </header>
    <TutorConversation goal={goal} conversation={conversation} />
  </>;
  if (panel.docked) return <aside ref={dock} aria-label={t("tutor.title")} data-testid="tutor-dock" className="sticky top-0 flex h-dvh w-(--w-tutor) shrink-0 flex-col gap-4 border-l bg-background">{content}</aside>;
  return <Sheet open={panel.open} onOpenChange={(open) => { if (!open) panel.close(); }}>
    <SheetContent showCloseButton={false} className="flex flex-col data-[side=right]:h-dvh data-[side=right]:w-full data-[side=right]:sm:max-w-(--w-dialog)" onCloseAutoFocus={(e) => { e.preventDefault(); panel.restoreFocus(); }}>
      {content}
    </SheetContent>
  </Sheet>;
}
