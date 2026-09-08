import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionItem } from "@/lib/schemas";

export function SessionHeader({ session }: { session: SessionItem }) {
  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/learning-path">
          <ArrowLeft aria-hidden /> Path
        </Link>
      </Button>
      <p className="eyebrow mt-4">{session.id}</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">{session.title}</h1>
      <p className="mt-2 max-w-(--w-measure) text-sm leading-relaxed text-muted-foreground">{session.abstract}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {session.associated_skills.map((s) => (
          <Badge key={s} variant="secondary">
            {s}
          </Badge>
        ))}
        {session.if_learned && <Badge className="bg-success-soft text-success">Learned</Badge>}
      </div>
    </div>
  );
}
