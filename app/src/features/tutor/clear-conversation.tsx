"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

export function ClearConversation({ onClear, disabled }: { onClear: () => void; disabled: boolean }) {
  const { t } = useT();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} className="text-muted-foreground" aria-label={t("tutor.clear")}><Trash2 aria-hidden /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("polish.clearTutorTitle")}</DialogTitle><DialogDescription>{t("polish.clearTutorBody")}</DialogDescription></DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">{t("common.cancel")}</Button></DialogClose>
          <DialogClose asChild><Button variant="destructive" onClick={onClear}>{t("tutor.clear")}</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
