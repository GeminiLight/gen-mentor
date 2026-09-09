import { z } from "zod";

export const RequiredLevel = z.enum(["beginner", "intermediate", "advanced"]);
export const CurrentLevel = z.enum(["unlearned", "beginner", "intermediate", "advanced"]);
export const Confidence = z.enum(["low", "medium", "high"]);
export type RequiredLevel = z.infer<typeof RequiredLevel>;
export type CurrentLevel = z.infer<typeof CurrentLevel>;

export const LEVEL_ORDER: Record<CurrentLevel, number> = { unlearned: 0, beginner: 1, intermediate: 2, advanced: 3 };

/** Case-insensitive dedupe by `name`, first occurrence wins, capped at `max`. */
export function dedupeByName<T extends { name: string }>(items: T[], max = 10): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const key = it.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out.slice(0, max);
}

/** Accepts either `{ key: [...] }` or a bare array and returns the envelope form. */
export const envelope = <K extends string>(key: K) => (v: unknown) =>
  Array.isArray(v) ? ({ [key]: v } as Record<K, unknown[]>) : v;
