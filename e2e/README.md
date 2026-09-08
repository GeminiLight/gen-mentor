# e2e

Playwright journeys, axe accessibility checks and the screenshot evidence that
`scripts/verify-ui.sh` grades. Run everything with `make verify-ui` from the repo root;
run one spec against a dev server with `BASE_URL=http://127.0.0.1:3000 pnpm test specs/health.spec.ts`.

`fixtures/llm/` holds recorded model answers used when the app runs with
`GENMENTOR_LLM_MODE=replay`. Record with `GENMENTOR_LLM_MODE=record`.
