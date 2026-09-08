import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionItem } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function SessionRow({ session, index, isNext, minutes }: { session: SessionItem; index: number; isNext: boolean; minutes: number }) {
  const learned = session.if_learned;
  return (
    <li className={cn("flex gap-4 rounded-xl border p-4 transition-colors", isNext && "border-brand/60 bg-brand-soft/30", learned && "bg-muted/40")} data-testid="session-row" data-learned={learned || undefined}>
      <span className={cn("num flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium", learned && "border-brand bg-brand text-brand-foreground", isNext && !learned && "border-brand text-brand")} aria-hidden>
        {learned ? <Check className="size-4" /> : index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">{session.title}</h2>
          {isNext && <Badge>Up next</Badge>}
          {learned && minutes > 0 && <span className="num text-xs text-muted-foreground">{minutes} min</span>}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{session.abstract}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {session.desired_outcome_when_completed.map((o) => (
            <Badge key={o.name} variant="outline" className="font-normal">
              {o.name} → {o.level}
            </Badge>
          ))}
        </div>
      </div>
      <Button size="sm" variant={isNext ? "default" : "outline"} asChild className="self-center">
        <Link href={`/session/${index}`}>
          {learned ? "Review" : "Learn"} <ArrowRight data-icon="inline-end" aria-hidden />
        </Link>
      </Button>
    </li>
  );
}
