"use client";

import type { RefObject } from "react";
import { BookOpen, CheckCheck, ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";

export type LibraryFilter = "all" | "reading" | "completed";
const FILTERS = [
  { key: "all", icon: ListFilter },
  { key: "reading", icon: BookOpen },
  { key: "completed", icon: CheckCheck },
] as const;

export function LibraryToolbar({ inputRef, query, onQuery, filter, onFilter, counts, matches }: {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string; onQuery: (value: string) => void;
  filter: LibraryFilter; onFilter: (value: LibraryFilter) => void;
  counts: Record<LibraryFilter, number>; matches: number;
}) {
  const { t } = useT();
  return <div className="mb-7 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div role="group" aria-label={t("polish.filterReadings")} className="flex max-w-full flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-xs">
        {FILTERS.map(({ key, icon: Icon }) => <Button key={key} variant="ghost" aria-pressed={filter === key} onClick={() => onFilter(key)}
          className="min-h-11 gap-2 px-3 text-muted-foreground aria-pressed:bg-brand-soft aria-pressed:text-brand">
          <Icon className="size-4" aria-hidden />{t(`polish.filter${key}`)}
          <span className="num text-xs">{counts[key]}</span>
        </Button>)}
      </div>
      <div className="relative w-full @3xl/workspace:max-w-(--w-col)">
        <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
        <Input ref={inputRef} type="search" className="h-11 bg-card pr-12 pl-10" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={t("polish.searchLibrary")} aria-label={t("polish.searchLibrary")} />
        {query && <Button variant="ghost" size="icon" className="absolute top-0 right-0" aria-label={t("polish.clearSearch")} onClick={() => { onQuery(""); inputRef.current?.focus(); }}><X aria-hidden /></Button>}
      </div>
    </div>
    <p className="text-xs text-muted-foreground" role="status">{matches ? t("polish.readingCount", { n: matches, total: counts.all }) : t("polish.noSearch")}</p>
  </div>;
}
