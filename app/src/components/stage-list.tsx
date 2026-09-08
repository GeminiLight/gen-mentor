import { Check, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

export type StageStatus = "pending" | "running" | "done" | "error";

/** Textual progress for multi-step agent work. Each stage says what the system is doing. */
export function StageList({ stages }: { stages: { key: string; label: string; status: StageStatus; detail?: string }[] }) {
  return (
    <ol className="space-y-2" aria-live="polite">
      {stages.map((s) => (
        <li key={s.key} className="flex items-start gap-3 text-sm">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
              s.status === "done" && "border-brand bg-brand text-brand-foreground",
              s.status === "running" && "border-brand text-brand",
              s.status === "error" && "border-destructive text-destructive",
              s.status === "pending" && "text-muted-foreground",
            )}
            aria-hidden
          >
            {s.status === "done" ? <Check className="size-3" /> : <CircleDashed className={cn("size-3", s.status === "running" && "animate-spin [animation-duration:2s]")} />}
          </span>
          <span className={cn(s.status === "pending" && "text-muted-foreground", s.status === "running" && "font-medium")}>
            {s.label}
            {s.detail && <span className="block text-xs font-normal text-muted-foreground">{s.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
