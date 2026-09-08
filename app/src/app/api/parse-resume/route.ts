import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";

export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;
const Upload = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number().int().positive().max(MAX_BYTES, "Résumé must be under 8 MB"),
});

/** Turns an uploaded PDF (or plain text) résumé into text for the skill-gap identifier. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach a file field named `file`" }, { status: 400 });
  const meta = Upload.safeParse({ name: file.name, type: file.type, size: file.size });
  if (!meta.success) return NextResponse.json({ error: "Invalid upload", issues: meta.error.issues }, { status: 400 });

  const isPdf = meta.data.type === "application/pdf" || meta.data.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return NextResponse.json({ text: await file.text(), pages: 1 });
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    return NextResponse.json({ text: text.replace(/[ \t]+\n/g, "\n").trim(), pages: totalPages });
  } catch (e) {
    console.error("[parse-resume]", e);
    return NextResponse.json({ error: "Could not read that PDF. Try exporting it again or paste the text." }, { status: 422 });
  }
}
