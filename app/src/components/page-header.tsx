import type { ReactNode } from "react";

/** One heading per page. Eyebrow and description are optional and stay quiet when present. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-lg font-semibold tracking-tight text-balance sm:text-xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-(--w-measure) text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
