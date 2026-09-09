"use client";

import {
  BookOpen,
  Check,
  Compass,
  Languages,
  LibraryBig,
  Moon,
  Plus,
  Route,
  Search,
  Sun,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LANGS, useLangStore, useT } from "@/lib/i18n";
import { useArchive, useActiveGoal } from "@/lib/store";

/** ⌘K / Ctrl+K. Jumps to pages, sessions and goals; the only global keyboard surface. */
export function CommandMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const goal = useActiveGoal();
  const { goals, setActiveGoal } = useArchive();
  const { t, lang } = useT();
  const setLang = useLangStore((s) => s.setLang);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={t("command.open")}>
              <Search aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("command.open")}</TooltipContent>
        </Tooltip>
      ) : (
        <button
          type="button"
          className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          onClick={() => setOpen(true)}
          aria-label={t("command.open")}
        >
          <Search className="size-4" aria-hidden />
          {t("common.search")}
          <kbd className="ml-auto rounded border bg-muted px-1 font-mono text-xs">⌘K</kbd>
        </button>
      )}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("command.title")}
        description={t("command.description")}
      >
        {/* CommandDialog does not mount the cmdk root itself; without <Command> every item crashes on an undefined store. */}
        <Command>
          <CommandInput placeholder={t("command.placeholder")} />
          <CommandList>
            <CommandEmpty>{t("command.empty")}</CommandEmpty>
            <CommandGroup heading={t("command.pages")}>
              <CommandItem onSelect={() => go("/goals")}>
                <Compass aria-hidden /> {t("nav.goals")}
              </CommandItem>
              {goal && (
                <>
                  <CommandItem onSelect={() => go("/learning-path")}>
                    <Route aria-hidden /> {t("path.eyebrow")}
                  </CommandItem>
                  <CommandItem onSelect={() => go("/library")}>
                    <LibraryBig aria-hidden /> {t("nav.library")}
                  </CommandItem>
                  <CommandItem onSelect={() => go("/progress")}>
                    <TrendingUp aria-hidden /> {t("nav.progress")}
                  </CommandItem>
                  <CommandItem onSelect={() => go("/profile")}>
                    <UserRound aria-hidden /> {t("nav.profile")}
                  </CommandItem>
                </>
              )}
              <CommandItem onSelect={() => go("/onboarding")}>
                <Plus aria-hidden /> {t("command.newGoal")}
              </CommandItem>
            </CommandGroup>
            {goal && goal.learning_path.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("command.sessions")}>
                  {goal.learning_path.map((s, i) => (
                    <CommandItem key={s.id + i} onSelect={() => go(`/session/${i}`)} value={`${s.id} ${s.title}`}>
                      <BookOpen aria-hidden /> {s.id} · {s.title}
                      {s.if_learned && (
                        <Check className="ml-auto size-4 text-success" aria-label={t("common.learned")} />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            {goals.length > 1 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("command.switchGoal")}>
                  {goals.map((g) => (
                    <CommandItem
                      key={g.id}
                      value={`goal ${g.learning_goal}`}
                      onSelect={() => {
                        setActiveGoal(g.id);
                        go("/learning-path");
                      }}
                    >
                      <Compass aria-hidden /> {g.learning_goal}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            <CommandSeparator />
            <CommandGroup heading={t("command.appearance")}>
              <CommandItem
                onSelect={() => {
                  setTheme(resolvedTheme === "dark" ? "light" : "dark");
                  setOpen(false);
                }}
              >
                {resolvedTheme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />} {t("command.toggleTheme")}
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setLang((LANGS.find((l) => l.value !== lang) ?? LANGS[0]).value);
                  setOpen(false);
                }}
              >
                <Languages aria-hidden /> {t("command.language")}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
