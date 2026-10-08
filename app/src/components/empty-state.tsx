import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, body, action, icon }: { icon?: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border bg-wash px-6 py-16 text-center">
      {icon && <Icon icon={icon} />}
      <p className="display text-lg">{title}</p>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function Icon({ icon: Glyph }: { icon: LucideIcon }) {
  return <Glyph className="mb-5 size-6 text-brand" strokeWidth={1.4} aria-hidden />;
}
