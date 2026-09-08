import { describe, expect, it } from "vitest";
import { extractJSON, jsonCall, LLMError, openaiArgs, type LLM } from "./core";
import { parsePartialJSON } from "./partial-json";

describe("extractJSON", () => {
  it("parses clean JSON", () => {
    expect(extractJSON('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips fences and prose", () => {
    expect(extractJSON('Sure! Here it is:\n```json\n{"a": [1,2]}\n```\nHope this helps.')).toEqual({ a: [1, 2] });
  });
  it("tolerates trailing commas and raw newlines in strings", () => {
    expect(extractJSON('{"text": "line one\nline two", "n": 1,}')).toEqual({ text: "line one\nline two", n: 1 });
  });
  it("tolerates unescaped inner quotes in Chinese prose", () => {
    expect(extractJSON('{"reason": "被"事实"接住"}')).toEqual({ reason: '被"事实"接住' });
  });
  it("repairs a truncated tail, keeping the partial string so streaming UIs can show it", () => {
    expect(extractJSON('{"skills": [{"name": "SQL", "level": "beg')).toEqual({ skills: [{ name: "SQL", level: "beg" }] });
  });
  it("throws a retryable error when there is no JSON at all", () => {
    expect(() => extractJSON("no json here")).toThrowError(LLMError);
  });
});

describe("parsePartialJSON", () => {
  it("returns null before the first brace", () => {
    expect(parsePartialJSON("thinking...")).toBeNull();
  });
  it("closes open structures progressively", () => {
    const chunks = ['{"path": [{"id": "S1", "title": "In', 'tro"}, {"id": "S2", "ti', 'tle": "Deep"}]}'];
    let acc = "";
    const seen: unknown[] = [];
    for (const c of chunks) {
      acc += c;
      seen.push(parsePartialJSON(acc));
    }
    expect(seen[0]).toEqual({ path: [{ id: "S1", title: "In" }] });
    expect(seen[1]).toEqual({ path: [{ id: "S1", title: "Intro" }, { id: "S2" }] });
    expect(seen[2]).toEqual({ path: [{ id: "S1", title: "Intro" }, { id: "S2", title: "Deep" }] });
  });
});

describe("openaiArgs", () => {
  const base = { tier: "fast" as const, system: "sys", messages: [{ role: "user" as const, content: "hi" }], maxTokens: 10 };
  it("only sends the thinking switch when the gateway is known to accept it", () => {
    expect(openaiArgs({ ...base, thinking: false }, "m", "max_tokens", false)).not.toHaveProperty("thinking");
    expect(openaiArgs({ ...base, thinking: false }, "m", "max_tokens", true)).toHaveProperty("thinking", { type: "disabled" });
  });
  it("uses the configured token parameter", () => {
    expect(openaiArgs(base, "m", "max_completion_tokens")).toHaveProperty("max_completion_tokens", 10);
  });
});

describe("jsonCall", () => {
  it("nudges once when the first answer is not JSON", async () => {
    const seen: string[] = [];
    const llm: LLM = {
      chatText: async (o) => {
        seen.push(o.messages[0].content);
        return seen.length === 1 ? "Let me think about that." : '{"ok": true}';
      },
      chatStream: () => {
        throw new Error("unused");
      },
    };
    await expect(jsonCall({ tier: "fast", system: "s", user: "u", maxTokens: 100 }, llm)).resolves.toEqual({ ok: true });
    expect(seen).toHaveLength(2);
    expect(seen[1]).toMatch(/Return ONLY the JSON/);
  });
});
