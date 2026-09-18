"use client";

import { ArrowDown, Send, Square } from "lucide-react";
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
  const { draft, setDraft, pending, question, atBottom, onScroll, jumpToLatest, attachList, suggestions, send, abort } = conversation;
  return <>
        <div className="relative min-h-0 flex-1">
        <div ref={attachList} onScroll={onScroll} role="log" aria-label={t("tutor.title")} className="h-full space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-12 text-sm" data-testid="tutor-messages">
          {goal.tutor.length === 0 && pending === null && (
            <div className="space-y-3">
              <p className="text-muted-foreground">{t("tutor.empty")}</p>
              <div className="flex flex-col gap-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
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
        {!atBottom && <Button type="button" size="sm" variant="secondary" className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-sm" onClick={jumpToLatest}><ArrowDown aria-hidden />{t("navigation.latestMessage")}</Button>}
        </div>
        <form
          className="shrink-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex items-end gap-2">
          <Textarea data-tutor-composer
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
            className="max-h-[min(10rem,25dvh)] min-h-11 resize-none overflow-y-auto"
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
          </div>
          <p className="mt-2 hidden text-xs text-muted-foreground md:block">{t("navigation.composeHelp")}</p>
        </form>
  </>;
}

function Bubble({ turn, streaming }: { turn: ChatTurn; streaming?: boolean }) {
  const mine = turn.role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "min-w-0 max-w-[85%] wrap-anywhere rounded-lg px-3 py-2 leading-relaxed",
          mine ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted",
        )}
        aria-busy={streaming}
      >
        {mine ? turn.content : <Prose text={turn.content} />}
      </div>
    </div>
  );
}
