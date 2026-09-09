import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chunked, fixtureHash, readFixture, writeFixture } from "./replay";
import type { ChatOpts } from "./core";

const req: ChatOpts = { tier: "smart", system: "sys", messages: [{ role: "user", content: "q" }], maxTokens: 4000 };

describe("replay fixtures", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gm-fixtures-"));
    process.env.GENMENTOR_LLM_FIXTURES = dir;
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.GENMENTOR_LLM_FIXTURES;
  });

  it("hashes identical requests identically and distinct requests distinctly", () => {
    expect(fixtureHash(req, "m")).toBe(fixtureHash({ ...req }, "m"));
    expect(fixtureHash(req, "m")).not.toBe(fixtureHash({ ...req, system: "sys2" }, "m"));
    expect(fixtureHash(req, "m")).not.toBe(fixtureHash(req, "other-model"));
  });

  it("round-trips a recording", () => {
    writeFixture(req, "m", "answer");
    expect(readFixture(req, "m").text).toBe("answer");
  });

  it("refuses to replay a missing fixture instead of going live", () => {
    expect(() => readFixture(req, "m")).toThrowError(/No LLM fixture/);
  });

  it("re-chunks recorded text for streaming", async () => {
    const parts: string[] = [];
    for await (const p of chunked("abcdefghij", 4)) parts.push(p);
    expect(parts).toEqual(["abcd", "efgh", "ij"]);
  });
});
