"use client";

import { BookOpen, Compass, Route, Sparkles } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";

export function CommandSection() {
  return (
    <section className="space-y-4" aria-labelledby="command">
      <h2 id="command" className="text-lg font-semibold">
        Command palette
      </h2>
      <Command className="max-w-(--w-dialog) rounded-lg border">
        <CommandInput placeholder="Jump to a session, skill or page…" />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>
          <CommandGroup heading="Pages">
            <CommandItem>
              <Compass aria-hidden /> Goals <CommandShortcut>G</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Route aria-hidden /> Learning path <CommandShortcut>P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Sparkles aria-hidden /> Progress <CommandShortcut>R</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Sessions">
            <CommandItem>
              <BookOpen aria-hidden /> Session 2 · Working with Pandas DataFrames
            </CommandItem>
            <CommandItem>
              <BookOpen aria-hidden /> Session 3 · Data Aggregation with groupby
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </section>
  );
}
