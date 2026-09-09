"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

/** Regenerating discards the document and quiz; ask first. */
export function RegenerateButton({ disabled, onConfirm }: { disabled?: boolean; onConfirm: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled}>
          <RefreshCw aria-hidden /> {t("session.regenerate")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("session.regenerateTitle")}</DialogTitle>
          <DialogDescription>{t("session.regenerateBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {t("session.regenerate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
