/** Knowledge Explorer, Knowledge Drafter (search-enhanced) and Document Integrator. */
import type { PromptValue } from "@/lib/prompts/format";
import { documentIntegratorSystem, documentIntegratorTask } from "@/lib/prompts/document-integrator";
import { knowledgeDrafterSystem, knowledgeDrafterTask } from "@/lib/prompts/knowledge-drafter";
import { knowledgeExplorerSystem, knowledgeExplorerTask } from "@/lib/prompts/knowledge-explorer";
import { DocumentStructure, KnowledgeDraft, KnowledgePoints, type KnowledgePoint, type Source } from "@/lib/schemas";
import { formatResources, webSearch } from "@/lib/search";
import { runJSON, streamJSON } from "./run";

export function exploreKnowledge(input: { learner_profile: PromptValue; learning_path: PromptValue; learning_session: PromptValue }) {
  return runJSON({ tier: "smart", system: knowledgeExplorerSystem, task: knowledgeExplorerTask, vars: input }, KnowledgePoints);
}

export interface DraftInput {
  learner_profile: PromptValue;
  learning_session: PromptValue;
  knowledge_point: KnowledgePoint | string;
  external_resources?: string;
  use_search?: boolean;
}

const titleOf = (v: PromptValue) => (typeof v === "object" && v && "title" in v ? String((v as { title: unknown }).title) : typeof v === "string" ? v : "");

/** Streams the draft; the resolved value carries machine-generated `sources` for the `[N]` markers. */
export async function draftKnowledge(input: DraftInput, onDelta?: (d: string) => void): Promise<KnowledgeDraft> {
  let external = input.external_resources ?? "";
  let sources: Source[] = [];
  if (input.use_search ?? true) {
    const name = typeof input.knowledge_point === "string" ? input.knowledge_point : input.knowledge_point.name;
    const hits = await webSearch(`${titleOf(input.learning_session)} ${name}`.trim());
    const formatted = formatResources(hits);
    if (formatted.text) external = `${external}${formatted.text}`;
    sources = formatted.sources;
  }
  const draft = await streamJSON(
    {
      tier: "smart",
      system: knowledgeDrafterSystem,
      task: knowledgeDrafterTask,
      vars: {
        learner_profile: input.learner_profile,
        learning_session: input.learning_session,
        knowledge_point: input.knowledge_point,
        external_resources: external,
      },
    },
    KnowledgeDraft,
    onDelta,
  );
  return { ...draft, sources };
}

export interface IntegrateInput {
  learner_profile: PromptValue;
  learning_path: PromptValue;
  learning_session: PromptValue;
  knowledge_points: KnowledgePoint[];
  knowledge_drafts: KnowledgeDraft[];
}

export async function integrateDocument(input: IntegrateInput, onDelta?: (d: string) => void) {
  const structure = await streamJSON(
    {
      tier: "smart",
      system: documentIntegratorSystem,
      task: documentIntegratorTask,
      vars: {
        learner_profile: input.learner_profile,
        learning_path: input.learning_path,
        learning_session: input.learning_session,
        knowledge_drafts: input.knowledge_drafts,
      },
    },
    DocumentStructure,
    onDelta,
  );
  return { structure, markdown: renderMarkdown(structure, input.knowledge_points, input.knowledge_drafts) };
}

const PART_TITLES: Record<KnowledgePoint["type"], string> = {
  foundational: "## Foundational Concepts",
  practical: "## Practical Applications",
  strategic: "## Strategic Insights",
};

function formatSources(sources: Source[]): string {
  const lines = sources.filter((s) => s.title || s.source).map((s) => `[${s.index}] ${s.title}${s.source && s.source !== s.title ? ` — ${s.source}` : ""}`);
  return lines.length ? `**Sources**\n\n${lines.join("\n")}` : "";
}

/** Same layout as the Python `prepare_markdown_document`: drafts grouped by knowledge type. */
export function renderMarkdown(doc: DocumentStructure, points: KnowledgePoint[], drafts: KnowledgeDraft[]): string {
  let md = `# ${doc.title}\n\n${doc.overview}`;
  for (const [type, header] of Object.entries(PART_TITLES) as [KnowledgePoint["type"], string][]) {
    md += `\n\n${header}\n`;
    points.forEach((kp, idx) => {
      if (kp.type !== type) return;
      const kd = drafts[idx];
      if (!kd) return;
      md += `\n\n### ${kd.title}\n\n${kd.content}\n`;
      const refs = formatSources(kd.sources);
      if (refs) md += `\n\n${refs}\n`;
    });
  }
  return `${md}\n\n## Summary\n\n${doc.summary}`;
}
