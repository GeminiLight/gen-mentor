"use client";

import { ChevronDown, LoaderCircle, RefreshCw } from "lucide-react";
import { Popover } from "radix-ui";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import type { Byok } from "@/lib/llm/config";
import { useModelCatalog } from "./use-model-catalog";

/** Remounted when connection credentials change, so the two fields share only the current catalog. */
export function ModelFields({ form, onChange }: { form: Byok; onChange: (patch: Partial<Byok>) => void }) {
  const { t } = useT();
  const catalog = useModelCatalog(form);
  return (
    <div className="grid gap-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <ModelPicker id="llm-fast" label={t("settings.fastModel")} value={form.fastModel ?? ""} onChange={(fastModel) => onChange({ fastModel })} catalog={catalog} />
        <ModelPicker id="llm-smart" label={t("settings.smartModel")} value={form.smartModel ?? ""} onChange={(smartModel) => onChange({ smartModel })} catalog={catalog} />
      </div>
      <p className="text-xs text-muted-foreground">{t("settings.catalogHint")}</p>
    </div>
  );
}

function ModelPicker({ id, label, value, onChange, catalog }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  catalog: ReturnType<typeof useModelCatalog>;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex min-w-0 gap-0">
        <Popover.Root open={open} onOpenChange={(next) => { setOpen(next); if (next) { setQuery(""); void catalog.load(); } }}>
          <Popover.Trigger asChild>
            <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11 shrink-0 rounded-r-none border-r-0" aria-label={t("settings.chooseModel", { model: label })}>
              <ChevronDown aria-hidden className="size-4" />
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content onOpenAutoFocus={(event) => { event.preventDefault(); search.current?.focus(); }} align="start" sideOffset={6} collisionPadding={16} aria-label={t("settings.chooseModel", { model: label })} className="z-50 flex max-h-(--radix-popover-content-available-height) w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
              <div className="flex items-center justify-between gap-3 border-b px-3 py-1">
                <span className="text-sm font-medium">{t("settings.availableModels")}</span>
                <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={!catalog.valid || catalog.status === "loading"} aria-label={t("settings.refreshModels")} onClick={() => void catalog.load(true)}>
                  {catalog.status === "loading" ? <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : <RefreshCw aria-hidden className="size-4" />}
                </Button>
              </div>
              <Command className="min-h-0" label={t("settings.searchModels")}>
                <CommandInput ref={search} value={query} onValueChange={setQuery} placeholder={t("settings.searchModels")} aria-label={t("settings.searchModels")} />
                <CommandList aria-label={t("settings.availableModels")}>
                  {!catalog.valid ? <p role="status" className="p-3 text-sm text-muted-foreground">{t("settings.catalogConnection")}</p>
                    : catalog.status === "loading" && !catalog.data ? <p role="status" className="p-3 text-sm text-muted-foreground">{t("settings.catalogLoading")}</p>
                    : catalog.status === "error" ? <p role="status" className="p-3 text-sm text-muted-foreground">{t(`settings.${catalog.error}`)}</p> : null}
                  {catalog.data && <>
                    <CommandEmpty>{t(catalog.data.models.length ? "settings.catalogNoMatch" : "settings.catalogEmpty")}</CommandEmpty>
                    <CommandGroup heading={t("settings.catalogCount", { n: catalog.data.models.length })}>
                      {catalog.data.models.map((model) => <CommandItem key={model.id} value={model.id} keywords={model.name ? [model.name] : []} data-checked={value === model.id} onSelect={() => { onChange(model.id); setOpen(false); }}>
                        <span className="min-w-0 break-all">{model.name && model.name !== model.id ? <><span className="block">{model.name}</span><span className="block text-xs text-muted-foreground">{model.id}</span></> : model.id}</span>
                      </CommandItem>)}
                    </CommandGroup>
                  </>}
                </CommandList>
              </Command>
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">{t(catalog.data?.truncated ? "settings.catalogTruncated" : "settings.catalogFootnote")}</p>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <Input id={id} className="min-h-11 min-w-0 rounded-l-none" autoComplete="off" spellCheck={false} value={value} onChange={(e) => onChange(e.target.value)} placeholder={t("settings.modelId")} />
      </div>
    </div>
  );
}
