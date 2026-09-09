"use client";

import { Download, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useArchive } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { archiveFileName, archiveToBlob, parseArchive } from "@/lib/store/archive";

/** The archive is the learner's property: one JSON file out, the same file back in. */
export function ArchivePanel() {
  const { exportArchive, importArchive, goals } = useArchive();
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
      importArchive(archive);
      toast.success(t("profile.imported", { n: archive.goals.length }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("profile.importFailed"));
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
      </CardContent>
    </Card>
  );
}
