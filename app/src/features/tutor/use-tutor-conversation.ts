"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import type { ChatTurn, SessionItem } from "@/lib/schemas";
import { useArchive, type Goal } from "@/lib/store";

export function useTutorConversation(goal: Goal, session?: SessionItem, context?: string) {
  const { appendTutor } = useArchive();
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const followRef = useRef(true);
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

  useEffect(() => () => { abort.current?.abort(); }, []);

  const send = async () => {
    const content = draft.trim();
    if (!content || abort.current) return;
    const history: ChatTurn[] = [...goal.tutor, { role: "user", content }];
    const ctrl = new AbortController();
    abort.current = ctrl;
    let partial = "";
    setDraft("");
    setQuestion(content);
    followRef.current = true;
    setPending("");
    try {
      const { raw } = await api.tutor(
        { messages: history, learner_profile: goal.learner_profile, external_resources: context },
        (text) => {
          partial = text;
          setPending(text);
          if (followRef.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
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

  return { draft, setDraft, pending, question, followRef, attachList, suggestions, send, abort };
}
