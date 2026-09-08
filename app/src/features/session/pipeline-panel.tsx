"use client";

import { StageList, type StageStatus } from "@/components/stage-list";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeDraft, KnowledgePoint } from "@/lib/schemas";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/pipeline";

export interface PipelineView {
  status: Record<Stage, StageStatus>;
  points?: KnowledgePoint[];
  drafts: Record<number, Partial<KnowledgeDraft>>;
  document?: { title?: string; overview?: string };
  error?: string;
}

// Category color rides a dot, never the text: the hues are tuned as marks, not as type.
const KT_DOT: Record<KnowledgePoint["type"], string> = {
  foundational: "bg-kt-foundational",
  practical: "bg-kt-practical",
  strategic: "bg-kt-strategic",
};

/** What the agents are doing right now, with whatever has streamed in so far. */
export function PipelinePanel({ view }: { view: PipelineView }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" data-loading="">
      <div className="space-y-6">
        <StageList
          stages={STAGES.map((s) => ({
            key: s,
            label: view.status[s] === "done" ? STAGE_LABELS[s].done : STAGE_LABELS[s].running,
            status: view.status[s],
            detail:
              s === "knowledge_drafts" && view.status[s] === "running" && view.points
                ? `${Object.keys(view.drafts).length} of ${view.points.length} points writing`
                : undefined,
          }))}
        />
        {view.error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive-soft p-3 text-sm text-destructive"
          >
            {view.error}
          </p>
        )}
      </div>

      <div className="space-y-6" aria-live="polite">
        {view.points && (
          <section className="space-y-2">
            <p className="eyebrow">Knowledge points</p>
            <ul className="flex flex-wrap gap-1.5">
              {view.points.map((kp, i) => (
                <li key={kp.name}>
                  <Badge variant="outline" className={view.drafts[i]?.content ? "" : "text-muted-foreground"}>
                    <span className={`size-2 rounded-full ${KT_DOT[kp.type]}`} aria-hidden />
                    {kp.name}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        )}
        {Object.entries(view.drafts).map(([i, d]) => (
          <section key={i} className="space-y-1">
            <p className="text-sm font-medium">
              {d.title ?? view.points?.[Number(i)]?.name ?? `Point ${Number(i) + 1}`}
            </p>
            <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {d.content ?? "…"}
            </p>
          </section>
        ))}
        {view.document && (
          <section className="space-y-1">
            <p className="eyebrow">Document</p>
            <p className="text-sm font-medium">{view.document.title ?? "…"}</p>
            {view.document.overview && (
              <p className="text-sm leading-relaxed text-muted-foreground">{view.document.overview}</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
