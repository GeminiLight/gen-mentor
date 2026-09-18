"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import type { SessionItem } from "@/lib/schemas";
import type { Goal } from "@/lib/store";
import { completeSession } from "@/lib/store/completion";

export function useCompleteSession(goal: Goal | null, session: SessionItem | undefined, index: number) {
  const router = useRouter();
  const { t } = useT();
  const complete = () => {
    if (!goal || !session) return;
    completeSession(goal.id, index);
    toast.success(t("session.completed"), { description: t("journey.savedLocally") });
    router.push("/learning-path");
  };
  return { complete, completing: false };
}
