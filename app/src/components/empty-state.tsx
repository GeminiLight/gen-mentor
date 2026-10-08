import type { LucideIcon } from "lucide-react";
import { FeatureIcon } from "./feature-icon";
import type { ReactNode } from "react";

export function EmptyState({ title, body, action, icon }: { icon?: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
      {icon && <FeatureIcon icon={icon} className="mb-5 size-14 rounded-2xl [&_svg]:size-6" />}
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
