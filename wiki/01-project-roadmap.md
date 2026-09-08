<!-- Last verified: 2026-09-09 | Current stage: M4 -->

# 项目路线图

任务全文在 `docs/rebuild/GO.md`，这里只维护状态。状态取值：`todo` / `doing` / `done`。

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M0 | 骨架、闸门通路、LLM 核心层、回放模式、E2E 工程 | done |
| M1 | 九个 agent、prompts 逐字迁移、zod schema、十个 route | done |
| M2 | 设计系统与 `/design` 靶子 | done |
| M3 | 核心旅程与本地档案 | done |
| M4 | 游戏化层 | doing |
| M5 | 精致度与部署 | todo |
| M6 | prompt 优化（带 baseline 对照） | todo |
| M7 | 删旧树、README、PR | todo |

## M0 功能索引

| 功能 | 位置 | 状态 |
|---|---|---|
| Next 16 工程、Tailwind v4、shadcn radix-nova | `app/` | done |
| LLM 核心层：provider 适配、宽松 JSON、流式部分 JSON | `app/src/lib/llm/core.ts`、`partial-json.ts` | done |
| fast / smart 双模型路由 | `app/src/lib/llm/index.ts` | done |
| live / record / replay | `app/src/lib/llm/replay.ts` | done |
| `/api/health` | `app/src/app/api/health/route.ts` | done |
| 主题（class 模式，跟随系统） | `app/src/components/theme-provider.tsx` | done |
| Playwright 截图、axe、健康检查 spec | `e2e/specs/` | done |
| CI 跑 `make gate` | `.github/workflows/gate.yml` | done |

## M1 功能索引

| 功能 | 位置 | 状态 |
|---|---|---|
| 12 组 prompt 逐字迁移（含 mapper、content creator、feedback simulator） | `app/src/lib/prompts/` | done |
| zod schema 对应全部 Pydantic 模型 | `app/src/lib/schemas/` | done |
| agent 编排与校验修复重问 | `app/src/lib/agents/` | done |
| 十个 POST route | `app/src/app/api/*/route.ts` | done |
| Tavily 搜索（可选） | `app/src/lib/search.ts` | done |
| 单元测试（fake LLM） | `app/src/lib/agents/__tests__/` | done |
| E2E 在 replay 下打通全部 route | `e2e/specs/agents.spec.ts` + `e2e/fixtures/llm/` | done |

## M2 功能索引

| 功能 | 位置 | 状态 |
|---|---|---|
| OKLCH token、六级字号三种字重由 `@theme` 强制 | `app/src/app/globals.css` | done |
| 17 个 shadcn 原语（radix-nova） | `app/src/components/ui/` | done |
| 主题切换、Toaster、TooltipProvider | `app/src/components/`、`layout.tsx` | done |
| `/design` 视觉回归靶子 | `app/src/app/design/`、`app/src/features/design/` | done |

## M3 功能索引

| 功能 | 位置 | 状态 |
|---|---|---|
| 本地档案：zustand persist、导出导入 | `app/src/lib/store/` | done |
| 流式 API 客户端（`@@final` 协议） | `app/src/lib/client.ts` | done |
| 内容流水线（探索 → 起草 → 整合 → 测验，按 checkpoint 恢复） | `app/src/lib/pipeline.ts` | done |
| 测验判定与 `quiz_performance` | `app/src/lib/quiz.ts` | done |
| 简历解析 `/api/parse-resume`（unpdf） | `app/src/app/api/parse-resume/` | done |
| 应用壳：桌面导航栏、手机底栏、导师抽屉 | `app/src/components/layout/`、`app/src/features/tutor/` | done |
| onboarding、goals、learning-path、session、library、progress、profile | `app/src/features/*`、`app/src/app/(app)/` | done |
| E2E 旅程（seed 档案 + replay fixture） | `e2e/specs/journeys.spec.ts`、`e2e/specs/seed.ts` | done |
