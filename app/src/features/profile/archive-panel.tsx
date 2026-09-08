"use client";

import { Download, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useArchive } from "@/lib/store";
import { archiveFileName, archiveToBlob, parseArchive } from "@/lib/store/archive";

/** The archive is the learner's property: one JSON file out, the same file back in. */
export function ArchivePanel() {
  const { exportArchive, importArchive, goals } = useArchive();
  const fileRef = useRef<HTMLInputElement>(null);

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
      toast.success(`Imported ${archive.goals.length} goal${archive.goals.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not import that file");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your archive</CardTitle>
        <CardDescription>Everything lives in this browser. Export a copy to move it, back it up, or wipe this device.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={download} disabled={goals.length === 0} data-testid="export-archive">
          <Download aria-hidden /> Export JSON
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import archive file" data-testid="import-archive" onChange={(e) => void upload(e.target.files?.[0])} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload aria-hidden /> Import JSON
        </Button>
      </CardContent>
    </Card>
  );
}
