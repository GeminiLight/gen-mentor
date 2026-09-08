"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";
import { useArchive, type Goal } from "@/lib/store";

/** Task C of the scheduler: learned sessions are kept verbatim, the rest is regenerated. */
export function RescheduleDialog({ goal }: { goal: Goal }) {
  const updateGoal = useArchive((s) => s.updateGoal);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");

  const run = async () => {
    setBusy(true);
    setPreview("");
    try {
      const { final } = await api.schedulePath(
        { task: "reschedule", learner_profile: goal.learner_profile, learning_path: goal.learning_path, session_count: -1, other_feedback: feedback.trim() },
        (t) => setPreview(t.slice(-240)),
      );
      if (!final) throw new Error("The scheduler did not return a path");
      updateGoal(goal.id, { learning_path: final.learning_path });
      toast.success("Path rescheduled", { description: `${final.learning_path.length} sessions, learned ones kept in place.` });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reschedule failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw aria-hidden /> Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule the path?</DialogTitle>
          <DialogDescription>Sessions you have completed stay exactly as they are. The remaining ones are regenerated from your current profile.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="feedback">Anything the scheduler should know?</Label>
          <Textarea id="feedback" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Shorter sessions, more SQL practice, skip the theory I already know…" disabled={busy} />
        </div>
        {busy && (
          <pre className="max-h-24 overflow-hidden rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground" aria-live="polite" data-loading="">
            {preview || "Scheduling…"}
          </pre>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void run()} disabled={busy}>
            {busy ? "Scheduling…" : "Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
