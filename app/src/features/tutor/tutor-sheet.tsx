"use client";

import { MessageCircle, Send, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import type { ChatTurn } from "@/lib/schemas";
import { useArchive, type Goal } from "@/lib/store";
import { cn } from "@/lib/utils";

/** The AI tutor, always one tap away. Replies stream in; history is kept per goal on the device. */
export function TutorSheet({ goal, context }: { goal: Goal; context?: string }) {
  const { appendTutor, clearTutor } = useArchive();
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const content = draft.trim();
    if (!content || pending !== null) return;
    const history: ChatTurn[] = [...goal.tutor, { role: "user", content }];
    setDraft("");
    setPending("");
    try {
      const { raw } = await api.tutor({ messages: history, learner_profile: goal.learner_profile, external_resources: context }, (t) => {
        setPending(t);
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
      appendTutor(goal.id, [{ role: "user", content }, { role: "assistant", content: raw.trim() }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("tutor.failed"));
      setDraft(content);
    } finally {
      setPending(null);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("tutor.open")}>
          <MessageCircle aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-(--w-dialog)">
        <SheetHeader>
          <SheetTitle>{t("tutor.title")}</SheetTitle>
          <SheetDescription>{t("tutor.lede", { context: context ? t("tutor.ledeContext") : "" })}</SheetDescription>
        </SheetHeader>
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 text-sm" data-testid="tutor-messages">
          {goal.tutor.length === 0 && pending === null && <p className="text-muted-foreground">{t("tutor.empty")}</p>}
          {goal.tutor.map((m, i) => (
            <Bubble key={i} turn={m} />
          ))}
          {pending !== null && <Bubble turn={{ role: "assistant", content: pending || "…" }} streaming />}
        </div>
        <form
          className="flex items-end gap-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder={t("tutor.placeholder")}
            aria-label={t("tutor.messageLabel")}
            className="min-h-0 resize-none"
          />
          <Button type="submit" size="icon" aria-label={t("tutor.send")} disabled={pending !== null || !draft.trim()}>
            <Send aria-hidden />
          </Button>
          {goal.tutor.length > 0 && (
            <Button type="button" variant="ghost" size="icon" aria-label={t("tutor.clear")} onClick={() => clearTutor(goal.id)}>
              <Trash2 aria-hidden />
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Bubble({ turn, streaming }: { turn: ChatTurn; streaming?: boolean }) {
  const mine = turn.role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap", mine ? "bg-primary text-primary-foreground" : "bg-muted")} aria-busy={streaming}>
        {turn.content}
      </div>
    </div>
  );
}
