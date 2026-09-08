import { beforeEach, describe, expect, it, vi } from "vitest";
import { lastUserMessage, requests, reset } from "./fake-llm";
import drafts from "./fixtures/knowledge_drafts.json";
import points from "./fixtures/knowledge_points.json";
import path from "./fixtures/learning_path.json";
import profile from "./fixtures/learner_profile.json";

vi.mock("@/lib/llm", async () => (await import("./fake-llm")).fakeLLMModule());

const { draftKnowledge, exploreKnowledge, integrateDocument, renderMarkdown } = await import("../knowledge");
const { KnowledgeDraft, KnowledgePoints } = await import("@/lib/schemas");

const session = path.learning_path[1];
const typedPoints = KnowledgePoints.parse(points).knowledge_points;
const typedDrafts = drafts.knowledge_drafts.map((d) => KnowledgeDraft.parse(d));

describe("schemas: knowledge", () => {
  it("round-trips points and defaults draft sources to []", () => {
    expect(KnowledgePoints.parse(points)).toEqual(points);
    expect(KnowledgeDraft.parse({ title: "t", content: "c" }).sources).toEqual([]);
  });
  it("tolerates a document whose summary was cut off by the token budget", async () => {
    const { DocumentStructure } = await import("@/lib/schemas");
    expect(DocumentStructure.parse({ title: "T", overview: "O", content: "C" }).summary).toBe("");
  });
});

describe("agents: explorer / drafter / integrator", () => {
  beforeEach(() => reset());

  it("explores knowledge points for a session", async () => {
    reset(points);
    const out = await exploreKnowledge({ learner_profile: profile, learning_path: path, learning_session: session });
    expect(out).toEqual(points);
    expect(lastUserMessage()).toContain("**Given Learning Session**:");
    expect(lastUserMessage()).toContain(session.title);
  });

  it("drafts a knowledge point without search and attaches empty sources", async () => {
    reset({ title: "Pandas DataFrames", content: "**What it is**\n\nA table." });
    const out = await draftKnowledge({ learner_profile: profile, learning_session: session, knowledge_point: typedPoints[1], use_search: false });
    expect(out).toEqual({ title: "Pandas DataFrames", content: "**What it is**\n\nA table.", sources: [] });
    expect(lastUserMessage()).toContain("**External Resources (for RAG)**:\n");
    expect(requests[0].tier).toBe("smart");
  });

  it("integrates drafts into a document and renders markdown grouped by knowledge type", async () => {
    const structure = { title: "Working with Pandas", overview: "Intro.", content: "Body.", summary: "Wrap." };
    reset(structure);
    const { structure: got, markdown } = await integrateDocument({
      learner_profile: profile,
      learning_path: path,
      learning_session: session,
      knowledge_points: typedPoints,
      knowledge_drafts: typedDrafts,
    });
    expect(got).toEqual(structure);
    expect(markdown.startsWith("# Working with Pandas\n\nIntro.")).toBe(true);
    expect(markdown.indexOf("## Foundational Concepts")).toBeLessThan(markdown.indexOf("## Practical Applications"));
    expect(markdown.indexOf("## Practical Applications")).toBeLessThan(markdown.indexOf("## Strategic Insights"));
    expect(markdown).toContain(`### ${typedDrafts[0].title}`);
    expect(markdown.trimEnd().endsWith("## Summary\n\nWrap.")).toBe(true);
  });

  it("renders a sources list only when a draft has provenance", () => {
    const withSources = [{ ...typedDrafts[0], sources: [{ index: 0, title: "NumPy docs", source: "https://numpy.org" }] }];
    const md = renderMarkdown({ title: "T", overview: "O", content: "", summary: "S" }, [typedPoints[0]], withSources);
    expect(md).toContain("**Sources**\n\n[0] NumPy docs — https://numpy.org");
    expect(renderMarkdown({ title: "T", overview: "O", content: "", summary: "S" }, [typedPoints[0]], [typedDrafts[0]])).not.toContain("**Sources**");
  });
});
