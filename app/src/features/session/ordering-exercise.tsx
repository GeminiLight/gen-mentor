"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n";
import type { OrderingAnswer } from "@/lib/schemas/hands-on";
import { cn } from "@/lib/utils";

export function OrderingExercise({ items, answer, locked, expected, onChange, onConfirm }: {
  items: string[]; answer: OrderingAnswer; locked: boolean; expected?: number[];
  onChange: (answer: OrderingAnswer) => void; onConfirm: () => void;
}) {
  const { t } = useT();
  const drag = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [announcement, announce] = useState("");
  const move = (from: number, to: number) => {
    if (locked || from === to || to < 0 || to >= items.length) return;
    const order = [...answer.order];
    const [item] = order.splice(from, 1);
    order.splice(to, 0, item);
    onChange({ order, confirmed: false });
    announce(t("handsOn.moved", { item: items[item], n: to + 1, total: items.length }));
  };
  return <div className="space-y-3">
    <p className="flex items-center gap-2 text-xs text-muted-foreground"><ListOrdered className="size-4 text-brand" aria-hidden />{t("handsOn.orderHint")}</p>
    <ol className="space-y-2" aria-label={t("handsOn.ordering")}>
      {answer.order.map((item, position) => <li key={item}
        className={cn("flex items-center gap-2 rounded-lg border bg-background px-3 py-2 transition-colors", over === position && "border-brand bg-brand-soft/40")}
        onDragOver={(event) => { if (!locked && drag.current !== null) { event.preventDefault(); setOver(position); } }}
        onDrop={(event) => { event.preventDefault(); if (drag.current !== null) move(drag.current, position); drag.current = null; setOver(null); }}>
        {!locked && <span draggable onDragStart={(event) => { drag.current = position; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(item)); }}
          onDragEnd={() => { drag.current = null; setOver(null); }} className="cursor-grab py-3 text-muted-foreground active:cursor-grabbing" aria-hidden><GripVertical className="size-4" /></span>}
        <span className="num text-xs text-muted-foreground" aria-hidden>{position + 1}</span>
        <span className="min-w-0 flex-1 break-words text-sm">{items[item]}</span>
        {!locked && <div className="flex shrink-0 flex-col sm:flex-row">
          {([-1, 1] as const).map((direction) => {
            const label = t(direction < 0 ? "handsOn.moveUp" : "handsOn.moveDown", { item: items[item] });
            const Icon = direction < 0 ? ArrowUp : ArrowDown;
            return <Tooltip key={direction}><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="aria-disabled:opacity-40" aria-label={label}
              aria-disabled={position + direction < 0 || position + direction >= items.length}
              onClick={() => move(position, position + direction)}><Icon aria-hidden /></Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
          })}
        </div>}
      </li>)}
    </ol>
    <p className="sr-only" role="status">{announcement}</p>
    {!locked && <Button type="button" variant="outline" size="sm" onClick={onConfirm}>{t("handsOn.checkOrder")}</Button>}
    {expected && <details className="rounded-lg bg-muted/50 p-3 text-sm">
      <summary className="cursor-pointer font-medium">{t("handsOn.reference")}</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5">{expected.map((item) => <li key={item}>{items[item]}</li>)}</ol>
    </details>}
  </div>;
}
