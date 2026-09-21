import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A consistent visual weight for feature, field and section identifiers. */
export function FeatureIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <span aria-hidden className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-brand-soft text-brand shadow-xs", className)}>
    <Icon className="size-5" strokeWidth={1.6} />
  </span>;
}
