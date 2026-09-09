/** Import / export of the whole archive as a JSON file. Nested data and session references are validated before import. */
import { ArchiveSchema } from "@/lib/schemas/archive";
import type { Archive } from "./types";

export function archiveToBlob(archive: Archive): Blob {
  return new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
}

export function archiveFileName(archive: Archive): string {
  return `genmentor-archive-${new Date(archive.exported_at).toISOString().slice(0, 10)}.json`;
}

export function parseArchive(text: string): Archive {
  return ArchiveSchema.parse(JSON.parse(text));
}
