/**
 * Lenient JSON helpers for model output. Two jobs:
 *   - `fixUnescapedQuotes`: models writing Chinese prose often drop a raw `"` inside
 *     a string (被"事实"接住). A quote only closes a string when the next
 *     non-space character is structural (, } ] :) or end of input.
 *   - `parsePartialJSON`: best-effort parse of a document that is still streaming,
 *     so the UI can render fields as they arrive instead of waiting for the end.
 */
export function fixUnescapedQuotes(src: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (!inStr) {
      if (ch === '"') inStr = true;
      out += ch;
      continue;
    }
    if (esc) {
      esc = false;
      out += ch;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      out += ch;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < src.length && /[ \n\r\t]/.test(src[j])) j++;
      const next = src[j];
      if (next === undefined || next === "," || next === "}" || next === "]" || next === ":") {
        inStr = false;
        out += ch;
      } else {
        out += '\\"';
      }
      continue;
    }
    out += ch;
  }
  return out;
}

/** JSON forbids raw control characters inside strings; models emit real newlines there. */
export function escapeControlCharsInStrings(src: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (const ch of src) {
    if (inStr) {
      if (esc) {
        esc = false;
        out += ch;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        out += ch;
        continue;
      }
      if (ch === '"') inStr = false;
      if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else out += ch;
      continue;
    }
    if (ch === '"') inStr = true;
    out += ch;
  }
  return out;
}

/**
 * Close any open string / array / object so the streamed prefix becomes valid JSON,
 * dropping dangling keys or half-written literals at the cut point.
 * Returns null when nothing parseable exists yet.
 */
export function parsePartialJSON<T = unknown>(text: string): Partial<T> | null {
  let s = text;
  const fence = s.indexOf("```");
  const firstBrace = Math.min(...["{", "["].map((c) => (s.indexOf(c) === -1 ? Infinity : s.indexOf(c))));
  // Only a fence that precedes the document is a wrapper; later ones live inside string values.
  if (fence !== -1 && fence < firstBrace) s = s.slice(fence + 3).replace(/^json/i, "");
  const start = Math.min(...["{", "["].map((c) => (s.indexOf(c) === -1 ? Infinity : s.indexOf(c))));
  if (start === Infinity) return null;
  s = fixUnescapedQuotes(escapeControlCharsInStrings(s.slice(start)));

  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let body = s;
  if (esc) body = body.slice(0, -1);
  if (inStr) body += '"';
  const closers = stack
    .slice()
    .reverse()
    .map((o) => (o === "{" ? "}" : "]"))
    .join("");

  const tryParse = (b: string): Partial<T> | null => {
    const candidate = b.replace(/,\s*$/, "") + closers;
    try {
      return JSON.parse(candidate) as Partial<T>;
    } catch {
      try {
        return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1")) as Partial<T>;
      } catch {
        return null;
      }
    }
  };

  // Progressive repairs at the cut point, each applied on top of the previous one.
  const repairs: ((b: string) => string)[] = [
    (b) => b,
    (b) => b.replace(/"(?:[^"\\]|\\.)*"\s*:\s*$/, ""), // dangling `"key":`
    (b) => b.replace(/(,|\{)\s*"(?:[^"\\]|\\.)*"\s*$/, "$1"), // dangling `"key` without colon
    (b) => b.replace(/"(?:[^"\\]|\\.)*"\s*:\s*-?\d*\.?\d*$/, ""), // dangling `"key": 0.`
    (b) => b.replace(/"(?:[^"\\]|\\.)*"\s*:\s*(true|false|null|tru|fals|nul|t|f|n|fa|tr|nu)?$/, ""),
    (b) => b.replace(/,\s*\{[^{}]*$/, ""), // half-written object at the end of an array
  ];
  let cur = body;
  for (const r of repairs) {
    cur = r(cur).replace(/,\s*$/, "");
    const out = tryParse(cur);
    if (out) return out;
  }
  return null;
}
