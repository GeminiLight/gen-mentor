"use client";

import { ArrowDown, ArrowUpRight, Send, Square, MessagesSquare } from "lucide-react";
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
            <div className="space-y-4 pt-2">
              <p className="text-muted-foreground">{t("tutor.empty")}</p>
              <div className="flex flex-col gap-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="group flex min-h-11 items-start gap-3 rounded-xl border bg-card px-3 py-3 text-left text-sm leading-relaxed shadow-xs transition-colors hover:border-brand/30 hover:bg-brand-soft/40 focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() => setDraft(q)}
                  >
                    <MessagesSquare className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /><span className="flex-1">{q}</span><ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
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
          className="shrink-0 border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex items-end gap-2 rounded-xl border bg-background/50 p-2 shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
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
            className="max-h-[min(10rem,25dvh)] min-h-11 resize-none overflow-y-auto border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
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
  const { t } = useT();
  return (
    <div className={cn("flex flex-col gap-1.5", mine ? "items-end" : "items-start")}><p className="px-1 text-xs text-muted-foreground">{t(mine ? "polish.tutorYou" : "polish.tutorAssistant")}</p>
      <div
        className={cn(
          "min-w-0 max-w-[85%] wrap-anywhere rounded-xl border px-4 py-3 leading-relaxed shadow-xs",
          mine ? "rounded-tr-sm border-brand/15 bg-brand-soft text-foreground whitespace-pre-wrap" : "rounded-tl-sm border-border bg-card",
        )}
        aria-busy={streaming}
      >
        {mine ? turn.content : <Prose text={turn.content} />}
      </div>
    </div>
  );
}
