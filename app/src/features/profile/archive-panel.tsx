"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Archive } from "@/lib/store/types";
import { useArchive } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { archiveFileName, archiveToBlob, parseArchive } from "@/lib/store/archive";

/** The archive is the learner's property: one JSON file out, the same file back in, and a way to wipe it. */
export function ArchivePanel() {
  const { exportArchive, importArchive, reset, goals } = useArchive();
  const [pending, setPending] = useState<Archive | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useT();

  const download = () => {
    const archive = exportArchive();
    const url = URL.createObjectURL(archiveToBlob(archive));
    const a = document.createElement("a");
    a.href = url;
    a.download = archiveFileName(archive);
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const archive = parseArchive(await file.text());
      if (goals.length > 0) setPending(archive);
      else { importArchive(archive); toast.success(t("profile.imported", { n: archive.goals.length })); }
    } catch {
      toast.error(t("polish.importInvalid"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.archiveTitle")}</CardTitle>
        <CardDescription>{t("profile.archiveLede")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={download} disabled={goals.length === 0} data-testid="export-archive">
          <Download aria-hidden /> {t("profile.export")}
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label={t("profile.importFile")} data-testid="import-archive" onChange={(e) => void upload(e.target.files?.[0])} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload aria-hidden /> {t("profile.import")}
        </Button>
        {goals.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" data-testid="delete-all">
                <Trash2 aria-hidden /> {t("profile.deleteAll")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("profile.deleteAllTitle")}</DialogTitle>
                <DialogDescription>{t("profile.deleteAllBody")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">{t("common.cancel")}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      reset();
                      toast.success(t("profile.deletedAll"));
                    }}
                  >
                    {t("common.delete")}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("polish.importTitle")}</DialogTitle>
              <DialogDescription>{t("polish.importBody", { incoming: pending?.goals.length ?? 0, current: goals.length })}</DialogDescription>
            </DialogHeader>
            <Button variant="outline" onClick={download}><Download aria-hidden />{t("polish.importBackup")}</Button>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPending(null)}>{t("common.cancel")}</Button>
              <Button variant="destructive" onClick={() => {
                if (!pending) return;
                importArchive(pending);
                toast.success(t("profile.imported", { n: pending.goals.length }));
                setPending(null);
              }}>{t("polish.importReplace")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
