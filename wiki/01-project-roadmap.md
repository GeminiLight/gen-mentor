<!-- Last verified: 2026-09-09 | Current stage: done -->

# 项目路线图

任务全文在 `docs/rebuild/GO.md`，这里只维护状态。状态取值：`todo` / `doing` / `done`。

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M0 | 骨架、闸门通路、LLM 核心层、回放模式、E2E 工程 | done |
| M1 | 九个 agent、prompts 逐字迁移、zod schema、十个 route | done |
| M2 | 设计系统与 `/design` 靶子 | done |
| M3 | 核心旅程与本地档案 | done |
| M4 | 游戏化层 | done |
| M5 | 精致度与部署 | done |
| M6 | prompt 优化（带 baseline 对照） | done |
| M7 | 删旧树、README、PR | done |

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

## M4 功能索引

| 功能 | 位置 | 状态 |
|---|---|---|
| 技能树：目标 → 技能 → 会话，由 profile 与路径驱动 | `app/src/features/progress/skill-tree.tsx` | done |
| 掌握度环（三段）与总进度环 | `app/src/features/progress/mastery-ring.tsx` | done |
| 掌握度时间线与每会话分钟数（Recharts，单序列） | `app/src/features/progress/footprint.tsx` | done |
| 测验即时判定与单次连击 | `app/src/features/session/quiz-view.tsx`、`quiz-question.tsx` | done |
| 分类调色板经 dataviz 校验器通过 | `app/src/app/globals.css` | done |
| e2e：空档案空态、seed 数值一致、连击行为 | `e2e/specs/gamification.spec.ts` | done |

## M5 功能索引

| 功能 | 位置 | 状态 |
|---|---|---|
| ⌘K 命令面板：页面、会话、切换目标、主题 | `app/src/components/layout/command-menu.tsx` | done |
| 跳到内容链接、route 级 error / loading / 404 | `app/src/components/layout/app-shell.tsx`、`app/src/app/(app)/` | done |
| 阅读页代码高亮（shiki 分词渲染 span，不用 innerHTML） | `app/src/features/session/code-block.tsx` | done |
| 阶段列表与流水线到阅读的过渡动效，尊重 reduced motion | `stage-list.tsx`、`session-view.tsx` | done |
| 200ms 内出现 skeleton / 乐观态的 spec | `e2e/specs/responsiveness.spec.ts` | done |
| Dockerfile（standalone 单进程） | `app/Dockerfile` | done |

## M6 功能索引

| 功能 | 位置 | 状态 |
|---|---|---|
| 五个固定评测用例 | `e2e/fixtures/eval/cases.json` | done |
| 评测运行器（切换 prompt 目录，同一 agent 代码） | `app/vitest.eval.config.mts`、`app/scripts/eval-prompts.eval.ts`、`scripts/eval-prompts.sh` | done |
| 并排报告生成 | `scripts/eval-report.py` | done |
| 评审与处置（quiz-generator 回退） | `wiki/reviews/review-2026-09-09-prompt-eval.md` | done |

## M7 功能索引

| 功能 | 位置 | 状态 |
|---|---|---|
| 删除 `frontend/`、`backend/`、旧启动脚本与旧 CI | 仓库根 | done |
| 论文实现标签 `paper-python-v1`（7a22a54） | git tag | done |
| README 重写 | `README.md` | done |

## 后续：UI/UX 打磨与中英文

| 功能 | 位置 | 状态 |
|---|---|---|
| 中英文词典、语言切换、`<html lang>` 同步 | `app/src/lib/i18n/`、`components/lang-toggle.tsx` | done |
| 全部页面与组件改用 `t()` | `app/src/features/*`、`components/layout/*` | done |
| 阅读页目录（滚动高亮）与路径页统计 | `features/session/document-toc.tsx`、`features/path/path-view.tsx` | done |
| 修复：⌘K 面板缺 cmdk 根节点崩溃；首页标题引用了不存在的字号 | `command-menu.tsx`、`home-view.tsx` | done |
| e2e：两种语言无键泄漏、切换持久化、浏览器语言默认 | `e2e/specs/i18n.spec.ts` | done |
