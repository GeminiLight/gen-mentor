"use client";

import { useEffect } from "react";
import { CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { Goal } from "@/lib/store";
import { refreshProfiles, useProfileActivity } from "@/lib/store/completion";

export function ProfileRefreshNotice({ goal }: { goal: Goal }) {
  const { t } = useT();
  const running = useProfileActivity((s) => !!s.running[goal.id]);
  const tasks = Object.values(goal.sessions).filter((s) => s.profile_update);
  const failed = tasks.some((s) => s.profile_update?.status === "failed");
  const count = tasks.length;
  useEffect(() => {
    if (count && !failed && !running) void refreshProfiles(goal.id);
  }, [goal.id, count, failed, running]);
  if (!count) return null;
  return <section className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4" aria-label={t("journey.profileStatus")}>
    <CheckCheck className="size-5 shrink-0 text-brand" aria-hidden />
    <div className="min-w-0 flex-1" role="status">
      <p className="text-sm font-medium">{t("journey.completionSafe")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t(failed ? "journey.profileFailed" : "journey.profileUpdating")}</p>
    </div>
    {failed && <Button size="sm" variant="outline" disabled={running} onClick={() => void refreshProfiles(goal.id, true)}><RefreshCw aria-hidden />{t("common.tryAgain")}</Button>}
  </section>;
}
