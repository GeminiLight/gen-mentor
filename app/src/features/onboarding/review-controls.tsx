"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { Review } from "./onboarding-state";

export function ReviewControls({ review, ready, onConfirm, onExtend }: {
  review: Review; ready: boolean; onConfirm: () => void; onExtend: () => void;
}) {
  const { t } = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (review.deadline === null || !ready) return;
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= review.deadline!) onConfirm();
    }, 250);
    return () => window.clearInterval(timer);
  }, [review.deadline, ready, onConfirm]);
  const editing = review.goal_draft !== undefined;
  const seconds = review.deadline === null ? 180 : Math.max(0, Math.min(180, Math.ceil((review.deadline - now) / 1000)));
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="sticky bottom-0 z-20 -mx-5 border-t bg-card px-5 py-4 sm:-mx-8 sm:px-8" data-testid="review-controls">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium"><Clock3 className="size-4 text-muted-foreground" aria-hidden />{editing ? t("review.timerPaused") : <>{t("review.autoContinue")} <span role="timer" className="num" data-testid="review-countdown">{time}</span></>}</p>
          <p className="max-w-(--w-measure) text-xs text-muted-foreground">{t(editing ? "review.editPauseHelp" : "review.timerHelp")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-11" aria-label={t("review.moreTime")} onClick={onExtend} disabled={editing || !ready}>{t("review.extendLabel")}</Button>
          <Button onClick={onConfirm} disabled={editing || !ready} className="h-11">{t("review.confirm")}<ArrowRight className="size-4" aria-hidden /></Button>
        </div>
      </div>
    </div>
  );
}
