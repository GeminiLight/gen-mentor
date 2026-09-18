"use client";

import { Check, ChevronsUpDown, Compass, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useT } from "@/lib/i18n";
import { useArchive, type Goal } from "@/lib/store";
import { learnedCount } from "@/lib/store/derive";
import { cn } from "@/lib/utils";

export function GoalSwitcher({ goal, compact = false }: { goal: Goal; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { goals, setActiveGoal } = useArchive();
  const { t } = useT();
  const router = useRouter();
  const go = (href: string) => { setOpen(false); router.push(href); };
  return <>
    <button data-goal-trigger type="button" onClick={() => setOpen(true)} aria-label={t("navigation.switchGoal")} aria-haspopup="dialog" aria-expanded={open}
      className={cn("group min-w-0 items-center gap-3 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50", compact ? "flex min-h-11 border-b px-4 py-2 md:hidden" : "mt-5 hidden w-full rounded-lg border bg-background/60 p-3 md:flex")}>
      <span className="min-w-0 flex-1">
        <span className={cn("text-xs text-muted-foreground", compact ? "sr-only" : "mb-1 block")}>{t("polish.currentGoal")}</span>
        <span className={cn("block text-sm font-medium", compact ? "truncate" : "line-clamp-2 wrap-anywhere")}>{goal.original_goal || goal.learning_goal}</span>
      </span>
      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
    <CommandDialog onCloseAutoFocus={(e) => {
      e.preventDefault();
      Array.from(document.querySelectorAll<HTMLButtonElement>("[data-goal-trigger]")).find((el) => el.getClientRects().length)?.focus();
    }} open={open} onOpenChange={setOpen} title={t("navigation.switchGoal")} description={t("navigation.goalHelp")}>
      <Command filter={(_, search, keywords) => search.trim().toLocaleLowerCase().split(/\s+/).every((word) => (keywords ?? []).join(" ").toLocaleLowerCase().includes(word)) ? 1 : 0}>
        <div className="px-3 pt-3 pb-2"><p className="text-sm font-medium">{t("navigation.switchGoal")}</p><p className="mt-1 text-xs text-muted-foreground">{t("navigation.goalHelp")}</p></div>
        <CommandInput placeholder={t("navigation.searchGoals")} aria-label={t("navigation.searchGoals")} />
        <CommandList className="p-1">
          <CommandEmpty>{t("navigation.noGoals")}</CommandEmpty>
          {goals.map((item) => <CommandItem key={item.id} value={item.id} keywords={[item.original_goal, item.learning_goal]} onSelect={() => {
            if (item.id === goal.id) { setOpen(false); return; }
            setActiveGoal(item.id); go("/learning-path");
          }} className="items-start gap-3 p-3 [&>svg:last-child]:hidden" aria-current={item.id === goal.id ? "true" : undefined} aria-label={item.original_goal || item.learning_goal}>
            <Compass className="mt-0.5 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1"><span className="block leading-snug wrap-anywhere">{item.original_goal || item.learning_goal}</span><span className="mt-1 block text-xs text-muted-foreground">{t("goals.sessionsLearned", { n: learnedCount(item), total: item.learning_path.length })}</span></span>
            {item.id === goal.id && <Check className="mt-0.5 text-brand" aria-label={t("common.active")} />}
          </CommandItem>)}
        </CommandList>
        <div className="flex justify-between gap-2 border-t p-2">
          <Button variant="ghost" onClick={() => go("/goals")}>{t("navigation.manageGoals")}</Button>
          <Button variant="outline" onClick={() => go("/onboarding")}><Plus aria-hidden />{t("goals.newGoal")}</Button>
        </div>
      </Command>
    </CommandDialog>
  </>;
}
