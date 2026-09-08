import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const APP_DIR = resolve(import.meta.dirname, "..", "..", "app", "src", "app");

/**
 * Every page.tsx under app/src/app, turned into a URL. Route groups `(x)` are dropped.
 * Dynamic segments are filled from `sampleParams` so they can still be visited.
 */
export function discoverRoutes(sampleParams: Record<string, string> = {}): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "page.tsx") {
        let route = "/" + relative(APP_DIR, dir).split(/[\\/]/).filter((seg) => seg && !/^\(.*\)$/.test(seg)).join("/");
        route = route.replace(/\[([^\]]+)\]/g, (_, p: string) => sampleParams[p] ?? "sample");
        out.push(route === "/" ? "/" : route.replace(/\/+/g, "/"));
      }
    }
  };
  walk(APP_DIR);
  return Array.from(new Set(out)).sort();
}

/** File-name slug matching scripts/verify-ui.sh: `/` → index, `/a/b` → a_b, `[id]` → :id. */
export function slugOf(route: string): string {
  const raw = discoverRawSegments(route);
  return raw === "" ? "index" : raw;
}

function discoverRawSegments(route: string): string {
  return route.replace(/^\//, "").replace(/\//g, "_");
}

export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 900 },
} as const;

export const THEMES = ["light", "dark"] as const;
