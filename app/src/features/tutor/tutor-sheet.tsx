"use client";

import { MessageCircle, Send, Square } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Prose } from "@/components/prose";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import type { ChatTurn, SessionItem } from "@/lib/schemas";
import { useArchive, type Goal } from "@/lib/store";
import { ClearConversation } from "./clear-conversation";
import { cn } from "@/lib/utils";

/**
 * The AI tutor, always one tap away. Replies stream in; history is kept per goal on the device.
 * On a session page the document is handed over as context and the suggestions name that session.
 */
export function TutorSheet({
  goal,
  session,
  context,
  variant = "icon",
}: {
  goal: Goal;
  /** The session the learner is looking at, if any; otherwise the next one on the path. */
  session?: SessionItem;
  /** Grounding text for the tutor, e.g. the open document's markdown. */
  context?: string;
  /** `rail` is a labeled row for the desktop navigation; `icon` a bare button for tight bars. */
  variant?: "icon" | "rail";
}) {
  const { appendTutor, clearTutor } = useArchive();
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const follow = useRef(true);
  const listRef = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  // The sheet mounts its list on open; a stable callback ref lands the learner on the latest turn.
  const attachList = useCallback((el: HTMLDivElement | null) => {
    listRef.current = el;
    el?.scrollTo({ top: el.scrollHeight });
  }, []);
  const focus = session ?? goal.learning_path.find((s) => !s.if_learned) ?? goal.learning_path[0];
  const suggestions = [
    t("tutor.suggestFocus"),
    ...(focus ? [t("tutor.suggestExplain", { title: focus.title }), t("tutor.suggestQuiz", { title: focus.title })] : []),
  ];

  const send = async () => {
    const content = draft.trim();
    if (!content || pending !== null) return;
    const history: ChatTurn[] = [...goal.tutor, { role: "user", content }];
    const ctrl = new AbortController();
    abort.current = ctrl;
    let partial = "";
    setDraft("");
    setQuestion(content);
    follow.current = true;
    setPending("");
    try {
      const { raw } = await api.tutor(
        { messages: history, learner_profile: goal.learner_profile, external_resources: context },
        (text) => {
          partial = text;
          setPending(text);
          if (follow.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        },
        ctrl.signal,
      );
      appendTutor(goal.id, [
        { role: "user", content },
        { role: "assistant", content: raw.trim() },
      ]);
    } catch (e) {
      // Stopped by the learner: keep what has arrived, or hand the question back if nothing did.
      if (ctrl.signal.aborted) {
        if (partial.trim()) appendTutor(goal.id, [{ role: "user", content }, { role: "assistant", content: partial.trim() }]);
        else setDraft(content);
      } else {
        toast.error(e instanceof Error ? e.message : t("tutor.failed"));
        setDraft(content);
      }
    } finally {
      abort.current = null;
      setPending(null);
      setQuestion(null);
    }
  };

  return (
    <Sheet>
      {variant === "rail" ? (
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <MessageCircle className="size-4" aria-hidden />
            {t("tutor.open")}
          </button>
        </SheetTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("tutor.open")}>
                <MessageCircle aria-hidden />
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("tutor.open")}</TooltipContent>
        </Tooltip>
      )}
      <SheetContent className="flex w-full flex-col sm:max-w-(--w-dialog)">
        <SheetHeader className="pr-20">
          <SheetTitle>{t("tutor.title")}</SheetTitle>
          <SheetDescription>{t("tutor.lede", { context: context ? t("tutor.ledeContext") : "" })}</SheetDescription>
        </SheetHeader>
        {goal.tutor.length > 0 && <ClearConversation onClear={() => clearTutor(goal.id)} disabled={pending !== null} />}
        <div ref={attachList} onScroll={(e) => { const el = e.currentTarget; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} role="log" className="flex-1 space-y-3 overflow-y-auto px-4 text-sm" data-testid="tutor-messages">
          {goal.tutor.length === 0 && pending === null && (
            <div className="space-y-3">
              <p className="text-muted-foreground">{t("tutor.empty")}</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="rounded-full border px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                    onClick={() => setDraft(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {goal.tutor.map((m, i) => (
            <Bubble key={i} turn={m} />
          ))}
          {question && <Bubble turn={{ role: "user", content: question }} />}
          {pending !== null && <Bubble turn={{ role: "assistant", content: pending || t("polish.sending") }} streaming />}
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
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder={t("tutor.placeholder")}
            aria-label={t("tutor.messageLabel")}
            className="min-h-0 resize-none"
          />
          {pending !== null ? (
            // Distinct keys so React does not turn this node into the submit button mid-click: the abort
            // settles in a microtask, before the browser runs the click's default action on the same element.
            <Button
              key="stop"
              type="button"
              size="icon"
              variant="outline"
              aria-label={t("tutor.stop")}
              data-testid="tutor-stop"
              onClick={(e) => {
                e.preventDefault();
                abort.current?.abort();
              }}
            >
              <Square className="fill-current" aria-hidden />
            </Button>
          ) : (
            <Button key="send" type="submit" size="icon" aria-label={t("tutor.send")} disabled={!draft.trim()}>
              <Send aria-hidden />
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
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 leading-relaxed",
          mine ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted",
        )}
        aria-busy={streaming}
      >
        {mine ? turn.content : <Prose text={turn.content} />}
      </div>
    </div>
  );
}
