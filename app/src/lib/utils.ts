export { cn } from "cn";

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

/**
 * Words for space-separated scripts plus characters for CJK, so a Chinese background or
 * document is counted as text rather than as one giant "word".
 */
export function textStats(text: string): { words: number; cjk: number } {
  const cjk = (text.match(CJK) ?? []).length;
  const rest = text.replace(CJK, " ").trim();
  return { words: rest ? rest.split(/\s+/).length : 0, cjk };
}

export const countWords = (text: string) => {
  const s = textStats(text);
  return s.words + s.cjk;
};

/** Minutes to read, at roughly 200 words or 350 CJK characters a minute. Never below one. */
export function readingMinutes(text: string): number {
  const s = textStats(text);
  return Math.max(1, Math.round(s.words / 200 + s.cjk / 350));
}
