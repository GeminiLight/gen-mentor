import type { LucideIcon } from "lucide-react";
import { FeatureIcon } from "./feature-icon";
import type { ReactNode } from "react";

/** One heading per page. Eyebrow and description are optional and stay quiet when present. */
export function PageHeader({ eyebrow, title, description, actions, icon }: { icon?: LucideIcon; eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-6">
      <div className="min-w-0 flex-1 basis-64">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <div className="flex items-center gap-3">{icon && <FeatureIcon icon={icon} />}<h1 className="text-lg font-semibold tracking-tight text-balance sm:text-xl">{title}</h1></div>
        {description && <p className="mt-3 max-w-(--w-measure) text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
