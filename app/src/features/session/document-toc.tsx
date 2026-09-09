"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

/** Stable, URL-safe ids from heading text; DocumentView uses the same function on its headings. */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "section";

export function tocFromMarkdown(markdown: string): TocItem[] {
  const seen = new Map<string, number>();
  const out: TocItem[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) inFence = !inFence;
    if (inFence) continue;
    const m = /^(##|###)\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const base = slugify(m[2]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.push({ id: n ? `${base}-${n}` : base, text: m[2], depth: m[1].length as 2 | 3 });
  }
  return out;
}

/** Sticky table of contents for the reader; highlights the section in view. */
export function DocumentToc({ items }: { items: TocItem[] }) {
  const { t } = useT();
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
  useEffect(() => {
    const targets = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -70% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);
  if (items.length < 2) return null;
  return (
    <nav aria-label={t("session.contents")} className="text-sm" data-testid="doc-toc">
      <p className="eyebrow mb-3">{t("session.contents")}</p>
      <ol className="space-y-1 border-l">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={cn(
                "-ml-px block border-l py-1 pl-3 text-muted-foreground transition-colors hover:text-foreground",
                i.depth === 3 && "pl-6 text-xs",
                active === i.id && "border-brand font-medium text-foreground",
              )}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
