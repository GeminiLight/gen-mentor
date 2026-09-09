"use client";

import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import type { Verdict } from "@/lib/quiz";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function VerdictMark({ v }: { v: Verdict | undefined }) {
  const { t } = useT();
  if (!v || v === "answered") return null;
  const good = v === "correct";
  return (
    <span
      className={cn(
        "ml-2 inline-flex items-center gap-1 text-xs font-medium",
        good ? "text-success" : v === "incorrect" ? "text-destructive" : "text-muted-foreground",
      )}
      data-verdict={v}
    >
      {good ? (
        <Check className="size-3.5" aria-hidden />
      ) : v === "incorrect" ? (
        <X className="size-3.5" aria-hidden />
      ) : null}
      {good ? t("quiz.correct") : v === "incorrect" ? t("quiz.incorrect") : t("quiz.unanswered")}
    </span>
  );
}

/** One question: title with verdict, options (or free text), then the explanation once judged. */
export function Question({
  n,
  text,
  verdict,
  explanation,
  hint,
  children,
}: {
  n: number;
  text: string;
  verdict?: Verdict;
  explanation?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3" data-testid="question" data-verdict={verdict}>
      <legend className="font-medium">
        <span className="num text-muted-foreground">{n}.</span> {text}
        {hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}
        <VerdictMark v={verdict} />
      </legend>
      {children}
      {verdict && verdict !== "unanswered" && explanation && (
        <p className="text-sm leading-relaxed text-muted-foreground">{explanation}</p>
      )}
    </fieldset>
  );
}

/** A selectable option that shows right/wrong the moment the question is judged. */
export function Option({
  name,
  type,
  checked,
  correct,
  judged,
  onChange,
  children,
}: {
  name: string;
  type: "radio" | "checkbox";
  checked: boolean;
  correct: boolean | null;
  judged: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <Label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm font-normal transition-colors has-checked:border-brand has-checked:bg-brand-soft/40",
        judged && correct === true && "border-success/60 bg-success-soft/50",
        judged && checked && correct === false && "border-destructive/60 bg-destructive-soft/50",
        judged && "cursor-default",
      )}
    >
      <input type={type} name={name} className="accent-brand" checked={checked} disabled={judged} onChange={onChange} />
      <span className="flex-1">{children}</span>
      {judged && correct === true && <Check className="size-4 text-success" aria-hidden />}
      {judged && checked && correct === false && <X className="size-4 text-destructive" aria-hidden />}
    </Label>
  );
}
