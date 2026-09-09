"use client";

import { Send, Square } from "lucide-react";
import { Prose } from "@/components/prose";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import type { ChatTurn } from "@/lib/schemas";
import type { Goal } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { useTutorConversation } from "./use-tutor-conversation";

export function TutorConversation({ goal, conversation }: { goal: Goal; conversation: ReturnType<typeof useTutorConversation> }) {
  const { t } = useT();
  const { draft, setDraft, pending, question, followRef, attachList, suggestions, send, abort } = conversation;
  return <>
        <div ref={attachList} onScroll={(e) => { const el = e.currentTarget; followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} role="log" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 text-sm" data-testid="tutor-messages">
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
          className="flex shrink-0 items-end gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
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
  </>;
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
