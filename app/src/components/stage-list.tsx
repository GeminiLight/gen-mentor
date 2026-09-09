"use client";

import { Check, CircleDashed } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type StageStatus = "pending" | "running" | "done" | "error";

/**
 * Textual progress for multi-step agent work. Each stage says what the system is doing, and the
 * running one shows how long it has been at it: agent calls are tens of seconds, and a number that
 * keeps moving is the difference between "working" and "hung".
 */
export function StageList({
  stages,
}: {
  stages: { key: string; label: string; status: StageStatus; detail?: string }[];
}) {
  const reduce = useReducedMotion();
  const { t } = useT();
  const running = stages.find((s) => s.status === "running")?.key ?? null;
  const elapsed = useElapsed(running);
  return (
    <ol className="space-y-2" aria-live="polite">
      {stages.map((s, i) => (
        <motion.li
          key={s.key}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: i * 0.04, ease: [0.2, 0, 0, 1] }}
          className="flex items-start gap-3 text-sm"
        >
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
            {s.status === "done" ? (
              <Check className="size-3" />
            ) : (
              <CircleDashed
                className={cn("size-3", s.status === "running" && "animate-spin [animation-duration:2s]")}
              />
            )}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1",
              s.status === "pending" && "text-muted-foreground",
              s.status === "running" && "font-medium",
            )}
          >
            {s.label}
            {s.detail && <span className="block text-xs font-normal text-muted-foreground">{s.detail}</span>}
          </span>
          {s.status === "running" && elapsed >= 2 && (
            <span className="num shrink-0 text-xs text-muted-foreground" data-testid="stage-elapsed">
              {t("common.elapsed", { n: elapsed })}
            </span>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

/** Seconds since `key` became the running stage; a new key reads as zero until its first tick. */
function useElapsed(key: string | null): number {
  const [tick, setTick] = useState<{ key: string | null; seconds: number }>({ key: null, seconds: 0 });
  useEffect(() => {
    if (key === null) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => setTick({ key, seconds: Math.floor((Date.now() - startedAt) / 1000) }), 1000);
    return () => window.clearInterval(id);
  }, [key]);
  return tick.key === key ? tick.seconds : 0;
}
