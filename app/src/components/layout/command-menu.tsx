"use client";

import { BookOpen, Compass, LibraryBig, Moon, Plus, Route, Sun, TrendingUp, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { useArchive, useActiveGoal } from "@/lib/store";

/** ⌘K / Ctrl+K. Jumps to pages, sessions and goals; the only global keyboard surface. */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const goal = useActiveGoal();
  const { goals, setActiveGoal } = useArchive();

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
      <Button variant="ghost" size="sm" className="hidden text-muted-foreground md:inline-flex" onClick={() => setOpen(true)} aria-label="Open command menu">
        Search
        <kbd className="ml-1 rounded border bg-muted px-1 font-mono text-xs">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Command menu" description="Jump to a page, session or goal">
        <CommandInput placeholder="Jump to a page, session or goal…" />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>
          <CommandGroup heading="Pages">
            <CommandItem onSelect={() => go("/goals")}>
              <Compass aria-hidden /> Goals <CommandShortcut>G</CommandShortcut>
            </CommandItem>
            {goal && (
              <>
                <CommandItem onSelect={() => go("/learning-path")}>
                  <Route aria-hidden /> Learning path <CommandShortcut>P</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => go("/library")}>
                  <LibraryBig aria-hidden /> Library <CommandShortcut>L</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => go("/progress")}>
                  <TrendingUp aria-hidden /> Progress <CommandShortcut>R</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => go("/profile")}>
                  <UserRound aria-hidden /> Profile <CommandShortcut>U</CommandShortcut>
                </CommandItem>
              </>
            )}
            <CommandItem onSelect={() => go("/onboarding")}>
              <Plus aria-hidden /> New goal
            </CommandItem>
          </CommandGroup>
          {goal && goal.learning_path.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Sessions">
                {goal.learning_path.map((s, i) => (
                  <CommandItem key={s.id + i} onSelect={() => go(`/session/${i}`)} value={`${s.id} ${s.title}`}>
                    <BookOpen aria-hidden /> {s.id} · {s.title}
                    {s.if_learned && <CommandShortcut>learned</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {goals.length > 1 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Switch goal">
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
          <CommandGroup heading="Appearance">
            <CommandItem
              onSelect={() => {
                setTheme(resolvedTheme === "dark" ? "light" : "dark");
                setOpen(false);
              }}
            >
              {resolvedTheme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />} Toggle theme
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
