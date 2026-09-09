"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { parsePartialJSON } from "@/lib/llm/partial-json";
import type { LearningPath } from "@/lib/schemas";
import { useArchive, type Goal } from "@/lib/store";

/** Task C of the scheduler: learned sessions are kept verbatim, the rest is regenerated. */
export function RescheduleDialog({ goal }: { goal: Goal }) {
  const updateGoal = useArchive((s) => s.updateGoal);
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Partial<LearningPath> | null>(null);

  const run = async () => {
    setBusy(true);
    setPreview(null);
    try {
      const { final } = await api.schedulePath(
        { task: "reschedule", learner_profile: goal.learner_profile, learning_path: goal.learning_path, session_count: -1, other_feedback: feedback.trim() },
        // The new path arrives as JSON; show the session titles as they take shape, not the raw text.
        (text) => {
          const partial = parsePartialJSON<LearningPath>(text);
          if (partial) setPreview(partial);
        },
      );
      if (!final) throw new Error(t("onboarding.schedulerNoPath"));
      updateGoal(goal.id, { learning_path: final.learning_path });
      toast.success(t("path.rescheduled"), { description: t("path.rescheduledBody", { n: final.learning_path.length }) });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("path.rescheduleFailed"));
    } finally {
      setBusy(false);
    }
  };

  const titles = preview?.learning_path?.map((s) => s?.title).filter((x): x is string => !!x) ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw aria-hidden /> {t("path.reschedule")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("path.rescheduleTitle")}</DialogTitle>
          <DialogDescription>{t("path.rescheduleBody")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="feedback">{t("path.feedbackLabel")}</Label>
          <Textarea id="feedback" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t("path.feedbackPlaceholder")} disabled={busy} />
        </div>
        {busy && (
          <div className="max-h-40 overflow-hidden rounded-md bg-muted p-3 text-sm" aria-live="polite" data-loading="">
            {titles.length === 0 ? (
              <p className="text-muted-foreground">{t("path.scheduling")}</p>
            ) : (
              <ol className="space-y-1">
                {titles.map((title, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="num w-5 shrink-0 text-muted-foreground">{i + 1}</span>
                    <span className="truncate">{title}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void run()} disabled={busy}>
            {busy ? t("path.scheduling") : t("path.reschedule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
