/**
 * Record / replay for LLM calls so E2E and agent tests never depend on a live
 * model. `GENMENTOR_LLM_MODE`:
 *   live    call the provider
 *   record  call the provider and write the exchange to a fixture
 *   replay  read the fixture; a missing fixture is an error, never a silent live call
 *
 * Fixtures live in `e2e/fixtures/llm/<hash>.json` (override with
 * `GENMENTOR_LLM_FIXTURES`). The hash covers everything that shapes the answer, so a
 * prompt edit invalidates its fixtures instead of replaying stale text.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LLMError, type ChatOpts } from "./core";

export type LLMMode = "live" | "record" | "replay";

export function llmMode(): LLMMode {
  const raw = (process.env.GENMENTOR_LLM_MODE ?? "live").trim().toLowerCase();
  return raw === "record" || raw === "replay" ? raw : "live";
}

export function fixtureDir(): string {
  return process.env.GENMENTOR_LLM_FIXTURES ?? resolve(process.cwd(), "..", "e2e", "fixtures", "llm");
}

export interface Fixture {
  hash: string;
  model: string;
  request: ChatOpts;
  text: string;
  recordedAt: string;
}

/** Stable hash of the request. Key order is fixed so equal requests hash equally. */
export function fixtureHash(o: ChatOpts, model: string): string {
  const canonical = JSON.stringify({
    model,
    tier: o.tier,
    system: o.system,
    messages: o.messages.map((m) => ({ role: m.role, content: m.content })),
    maxTokens: o.maxTokens,
    effort: o.effort ?? null,
    thinking: o.thinking ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 24);
}

export function readFixture(o: ChatOpts, model: string): Fixture {
  const hash = fixtureHash(o, model);
  const file = join(fixtureDir(), `${hash}.json`);
  if (!existsSync(file)) {
    throw new LLMError(
      `No LLM fixture ${hash} for tier=${o.tier} model=${model}. Run once with GENMENTOR_LLM_MODE=record.`,
      500,
    );
  }
  return JSON.parse(readFileSync(file, "utf8")) as Fixture;
}

export function writeFixture(o: ChatOpts, model: string, text: string): Fixture {
  const dir = fixtureDir();
  mkdirSync(dir, { recursive: true });
  const fixture: Fixture = { hash: fixtureHash(o, model), model, request: o, text, recordedAt: new Date().toISOString() };
  writeFileSync(join(dir, `${fixture.hash}.json`), JSON.stringify(fixture, null, 2) + "\n");
  return fixture;
}

/** Replay a recorded answer as a stream, chunked so partial-JSON rendering gets exercised. */
export async function* chunked(text: string, size = 24): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}
