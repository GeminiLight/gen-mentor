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

## 后续：产品体验审计（2026-09-09）

| 功能 | 位置 | 状态 |
|---|---|---|
| 路径行整行可点（手机端此前只有下一课有可见入口） | `features/path/session-row.tsx` | done |
| 内容流水线失败可从断点重试；onboarding 失败保留输入并从失败步骤续跑 | `features/session/pipeline-panel.tsx`、`features/onboarding/use-onboarding.ts` | done |
| 导师读取当前会话文档，建议按当前课命名；桌面栏改为带文字的入口 | `components/layout/app-shell.tsx`、`features/tutor/tutor-sheet.tsx` | done |
| 阶段列表显示运行秒数；重排对话框显示解析出的课名而非原始 JSON | `components/stage-list.tsx`、`features/path/reschedule-dialog.tsx` | done |
| 首页给回访者显示目标与下一课；测验交卷后就地提供「标记完成」 | `features/system/home-view.tsx`、`features/session/session-reader.tsx` | done |
| 用时按"坐下"累加，跨天间隔不计；阅读时长与字数按 CJK 字符计 | `lib/store/derive.ts`、`lib/utils.ts` | done |
| 图标按钮加 tooltip；删除目标对话框加取消；文库隐藏 0 来源；技能树手机端居中 | `components/*-toggle.tsx`、`features/goals/goal-card.tsx`、`features/library/`、`features/progress/skill-tree.tsx` | done |
| 文案：不再宣称"数据不离开设备"（输入会发给模型）；「随时间」改为「已掌握技能占比」；删除 28 个未使用的词典键 | `lib/i18n/{en,zh}.ts` | done |
| 画像「习惯」改为档案派生的真实活动（活跃天数、打开与完成数、每课用时、最近活跃） | `lib/store/derive.ts`、`features/profile/habits-card.tsx` | done |
| 未做测验就「标记完成」时先问一次；已完成的课在读完和交卷处给「下一课」 | `features/session/session-reader.tsx` | done |
| onboarding 提交按钮始终可点，空字段在提交时就地提示并聚焦；路径生成后 toast 到达 | `features/onboarding/goal-form.tsx`、`use-onboarding.ts` | done |
| 路径全部完成的收尾状态；路径页骨架按真实形状 | `features/path/path-view.tsx` | done |
| 导师回复可中途停止并保留已到内容；打开抽屉落在最新一轮 | `features/tutor/tutor-sheet.tsx` | done |
| 「删除全部数据」带确认；完成 toast 显示进度前后值；词典拆出 `*-shell.ts` 以守住 300 行预算 | `features/profile/archive-panel.tsx`、`lib/i18n/` | done |
| 画像「补充一点」同样改为就地校验；会话页浏览器标签显示课名 | `features/profile/profile-view.tsx`、`features/session/session-view.tsx` | done |

## 后续：学习体验精修（2026-09-09）

| 功能 | 位置 | 状态 |
|---|---|---|
| 回访学习书桌、当前课优先的路径页面、主次动作与移动操作区 | `features/system/learning-desk.tsx`、`features/path/current-session.tsx`、`components/layout/app-shell.tsx` | done |
| 阅读布局、移动目录、章节恢复、单篇下载、长课名处理 | `features/session/document-view.tsx`、`reading-bookmark.tsx`、`reading-tools.tsx` | done |
| 多选确认、测验草稿、简答待自评、漏答提交确认和覆盖率 | `features/session/quiz-view.tsx`、`use-quiz-draft.ts`、`lib/quiz.ts` | done |
| 出题独立恢复，已完成教材不被出题失败阻塞 | `features/session/session-view.tsx` | done |
| 创建目标的表单与阶段 checkpoint 持久化 | `lib/store/onboarding-draft.ts` | done |
| 重排后课程内容重绑定、已完成课程保护 | `lib/store/reconcile-path.ts` | done |
| 深校验档案、替换确认、导入前备份 | `lib/schemas/archive.ts`、`features/profile/archive-panel.tsx` | done |
| 导师组合输入保护、清空确认、提问即时显示、滚动跟随控制、固定/临时模式 | `features/tutor/` | done |
| 文库正文搜索、模型配置如实提示、进度估计标识 | `features/library/`、`features/settings/`、`features/progress/` | done |
| 12 条针对审计缺陷的回归测试 | `e2e/specs/polish-{quiz,recovery,layout}.spec.ts` | done |

本轮没有改 prompt、图表结构或 SDK 调用，也没有完成全部 30 项审计建议。
稳定课程 URL、完成事实与画像更新解耦、技能证据详情与跨目标文库继续保留在 backlog。

## 创建目标：确认与修订

| 功能 | 位置 | 状态 |
|---|---|---|
| 技能确认、当前/目标水平滑块、3 分钟计时与延时 | `features/onboarding/starting-point-review.tsx`、`review-controls.tsx` | done |
| 目标修订后重跑后续阶段、旧请求隔离与确认草稿恢复 | `features/onboarding/use-onboarding.ts`、`lib/store/onboarding-draft.ts` | done |
| 默认 Adaptive、无历史目标隐藏 Goals | `features/onboarding/goal-form.tsx`、`onboarding-page.tsx` | done |

验证包含手动确认、计时自动继续、编辑暂停与恢复、水平持久化、晚到请求、失败重试，
以及手机和桌面的明暗主题截图与 axe 检查。
