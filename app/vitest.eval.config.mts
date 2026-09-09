import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Prompt evaluation runner. `EVAL_PROMPTS_DIR` points `@/lib/prompts` at either the working
 * tree or a checkout of the `prompts-baseline` tag, so both variants run through the same
 * agent code and the same live model. Nothing here is part of `make gate`.
 */
const src = fileURLToPath(new URL("./src", import.meta.url));
const prompts = process.env.EVAL_PROMPTS_DIR ?? `${src}/lib/prompts`;

export default defineConfig({
  test: {
    include: ["scripts/eval-prompts.eval.ts"],
    environment: "node",
    testTimeout: 60 * 60 * 1000,
    hookTimeout: 60 * 60 * 1000,
    fileParallelism: false,
  },
  resolve: {
    alias: [
      { find: /^@\/lib\/prompts\/(.*)$/, replacement: `${prompts}/$1` },
      { find: /^@\/lib\/prompts$/, replacement: prompts },
      { find: /^@\/(.*)$/, replacement: `${src}/$1` },
    ],
  },
});
