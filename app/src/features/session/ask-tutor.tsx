"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { openTutorFrom } from "@/features/tutor/use-tutor-panel";
import { useT } from "@/lib/i18n";
import { useActiveGoal } from "@/lib/store";

/** Explicitly quote selected lesson text into a draft. Never sends a message for the learner. */
export function AskTutor() {
  const goal = useActiveGoal();
  const { t } = useT();
  const [quote, setQuote] = useState("");
  useEffect(() => {
    const update = () => {
      const selection = window.getSelection();
      const article = document.querySelector("article.reading");
      setQuote(selection && article?.contains(selection.anchorNode) && article.contains(selection.focusNode)
        ? selection.toString().trim().slice(0, 4000) + (selection.toString().trim().length > 4000 ? "…" : "") : "");
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);
  return <Button data-testid="ask-tutor" variant="outline" size="sm" className="h-11" onPointerDown={(e) => { if (quote) e.preventDefault(); }} onClick={(e) => {
    if (quote && goal) window.dispatchEvent(new CustomEvent("genmentor:quote", { detail: { goalId: goal.id, quote } }));
    openTutorFrom(e.currentTarget);
  }}><MessageCircle aria-hidden />{t(quote ? "journey.askSelection" : "journey.askTutor")}</Button>;
}
