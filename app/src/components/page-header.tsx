import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** One heading per page, set in the display serif. `icon` is accepted for call sites but not drawn: the title carries the hierarchy. */
export function PageHeader({ eyebrow, title, description, actions }: { icon?: LucideIcon; eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b pb-7">
      <div className="min-w-0 flex-1 basis-64">
        {eyebrow && <p className="eyebrow mb-4 text-brand">{eyebrow}</p>}
        <h1 className="display text-xl">{title}</h1>
        {description && <p className="mt-3 max-w-(--w-measure) text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
