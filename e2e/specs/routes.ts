import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const APP_DIR = resolve(import.meta.dirname, "..", "..", "app", "src", "app");

/**
 * Every page.tsx under app/src/app, turned into a URL. Route groups `(x)` are dropped.
 * Dynamic segments are filled from `sampleParams` so they can still be visited.
 */
export interface Route {
  /** The file-system route, e.g. `/session/[id]`; verify-ui.sh derives screenshot names from this. */
  pattern: string;
  /** The URL actually visited, with sample params filled in. */
  url: string;
}

export function discoverRoutes(sampleParams: Record<string, string> = {}): Route[] {
  const out = new Map<string, Route>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "page.tsx") {
        const segs = relative(APP_DIR, dir).split(/[\\/]/).filter((seg) => seg && !/^\(.*\)$/.test(seg));
        const pattern = "/" + segs.join("/");
        const url = pattern.replace(/\[([^\]]+)\]/g, (_, p: string) => sampleParams[p] ?? "sample");
        out.set(pattern, { pattern, url });
      }
    }
  };
  walk(APP_DIR);
  return [...out.values()].sort((a, b) => a.pattern.localeCompare(b.pattern));
}

/** File-name slug matching scripts/verify-ui.sh: `/` → index, `/a/b` → a_b, `[id]` → :id. */
export function slugOf(pattern: string): string {
  const raw = pattern.replace(/^\//, "").replace(/\//g, "_").replace(/\[/g, ":").replace(/\]/g, "");
  return raw === "" ? "index" : raw;
}

export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 900 },
} as const;

export const THEMES = ["light", "dark"] as const;
