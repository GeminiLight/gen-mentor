"use client";

import { useId, useState } from "react";
import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { configurationObject } from "@/lib/configuration";
import type { ConfigurationAnswer } from "@/lib/schemas/hands-on";

export function ConfigurationExercise({ n, answer, locked, expected, onChange, onConfirm }: {
  n: number; answer: ConfigurationAnswer; locked: boolean; expected?: string[];
  onChange: (answer: ConfigurationAnswer) => void; onConfirm: () => void;
}) {
  const { t } = useT();
  const id = useId();
  const [error, setError] = useState(false);
  const validate = () => {
    const value = configurationObject(answer.value);
    setError(value === null);
    if (!value) document.getElementById(id)?.focus();
    return value;
  };
  return <div className="space-y-3">
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b bg-muted/40 px-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground"><Braces className="size-4 text-brand" aria-hidden />{t("handsOn.json")}</span>
        {!locked && <Button type="button" size="sm" variant="ghost" onClick={() => { const value = validate(); if (value) onChange({ value: JSON.stringify(value, null, 2), confirmed: false }); }}>{t("handsOn.format")}</Button>}
      </div>
      <Textarea id={id} rows={8} maxLength={12000} spellCheck={false} autoCapitalize="off" autoCorrect="off"
        className="resize-y rounded-none border-0 bg-transparent font-mono text-sm leading-relaxed shadow-none"
        value={answer.value} disabled={locked} aria-label={t("handsOn.editor", { n })}
        aria-invalid={error || undefined} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        onChange={(event) => { setError(false); onChange({ value: event.target.value, confirmed: false }); }} />
    </div>
    <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">{t("handsOn.configurationHint")}</p>
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{t("handsOn.invalid")}</p>}
    {!locked && <Button type="button" size="sm" variant="outline" onClick={() => { if (validate()) onConfirm(); }}>{t("handsOn.checkConfiguration")}</Button>}
    {expected && <details className="rounded-lg bg-muted/50 p-3 text-sm">
      <summary className="cursor-pointer font-medium">{t("handsOn.reference")}</summary>
      {expected.map((value, i) => <pre key={i} className="mt-3 overflow-x-auto text-xs leading-relaxed"><code>{JSON.stringify(configurationObject(value), null, 2)}</code></pre>)}
    </details>}
  </div>;
}
