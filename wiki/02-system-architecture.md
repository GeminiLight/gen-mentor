<!-- Last verified: 2026-09-09 | Current stage: M2 -->

# 系统架构

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16.3（App Router）、React 19.2、TypeScript 5 strict |
| 样式 | Tailwind v4（CSS-first）、shadcn radix-nova 原语、OKLCH token 只在 `globals.css` |
| 状态 | zustand 5 加 `persist`，档案在 localStorage，可导出 |
| 校验 | zod 4，全部 route 入参必须过 zod |
| LLM | `openai` 与 `@anthropic-ai/sdk` 官方 SDK，不用 langchain |
| 动效 | `motion/react` |
| 语言 | `lib/i18n`：en / zh 词典，zustand 持久化的语言选择，`useT()` |
| 测试 | vitest（单元）、Playwright 加 axe（E2E 与可访问性） |
| 包管理 | pnpm 11 |

## 目录

```
app/src
├── app/                 路由与页面装配，page.tsx ≤ 120 行
│   └── api/*/route.ts   LLM 调用的唯一入口，≤ 120 行，逻辑放 lib/agents
├── components/ui/       shadcn 原语，代码归我们所有
├── components/          跨领域的壳层组件（主题、导航）
├── features/<domain>/   按领域切分的业务组件
└── lib/
    ├── llm/core.ts      可移植：类型、provider 请求形状、宽松 JSON、jsonCall
    ├── llm/partial-json.ts  流式部分 JSON 解析与引号修复
    ├── llm/replay.ts    live / record / replay
    ├── llm/index.ts     服务端 LLM：环境变量、fast/smart、SDK 实例化
    ├── api.ts           route 辅助：parseBody、fail、taskStream
    ├── client.ts        浏览器端 API 客户端
    ├── prompts/         全部 prompt 文本的唯一来源
    ├── schemas/         zod，全系统唯一数据契约
    ├── agents/          九个 agent 的编排
    └── store/           zustand 档案
```

## 客户端数据流

档案（`lib/store`）是唯一的状态来源：`goals[]`、`active_goal_id`，每个 goal 带技能差距、学习者
profile、路径、按 `goalId:index` 键的会话状态（知识点、草稿、文档、测验、结果、打开与完成时间）、
掌握度历史与导师对话。zustand `persist` 写 localStorage，`exportArchive` / `importArchive`
以同一 JSON 结构进出。

内容流水线跑在浏览器（`lib/pipeline.ts`）：探索知识点 → 并行起草每个点 → 整合文档 → 生成测验，
每个阶段完成即 checkpoint 进档案，刷新后从缺失的阶段继续。流式路由的增量文本用
`parsePartialJSON` 边收边渲染。完成会话时把 `quiz_performance` 并进 `learner_interactions`
调 profile update，标记 `if_learned`，记一条掌握度点。

## 自带密钥（BYOK）

学习者可以在设置里填自己的供应商、地址、密钥和模型（`features/settings/model-settings.tsx`），
保存在 localStorage（`genmentor.llm.v1`），由 `lib/client.ts` 以 `x-genmentor-llm` 请求头随每次调用发送。
服务端 `lib/llm/config.ts#byokFromRequest` 用 zod 校验后为该请求构造一个 LLM（`createLLM`），
路由用 `withRequestLLM` 把它放进 AsyncLocalStorage，agent 通过 `currentLLM()` 取用，服务端不落盘。
`POST /api/health` 用给定凭证做一次最小调用以便"测试"。BYOK 请求始终 live，不参与 record / replay。

## LLM 调用链

route 收到请求 → `parseBody(schema)` 校验 → `lib/agents/<agent>` 组装 prompt →
`jsonCall` 或 `chatStream`（`lib/llm/index.ts`）→ 按 `tier` 选模型 → 按
`GENMENTOR_LLM_MODE` 决定真调、录制或回放 → 结果经 `extractJSON` 或原样流回。

流式响应是纯文本流，结束时可追加 `\n@@final\n<json>` 作为权威结果，中途失败追加
`\n@@error\n<message>`。客户端用 `parsePartialJSON` 边收边渲染。

## 环境变量

| 变量 | 用途 | 默认 |
|---|---|---|
| `LLM_PROVIDER` | `openai` 或 `anthropic` | `openai` |
| `LLM_API_KEY` | 凭证，`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` 可作回退 | 必填 |
| `LLM_BASE_URL` | 网关地址，`OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` 可作回退 | 官方端点 |
| `LLM_FAST_MODEL` / `LLM_SMART_MODEL` | 双档模型 | `glm-5.3-flash` |
| `LLM_OPENAI_THINKING` | `disabled` 允许向 GLM 类网关发送关思考字段 | 不发送 |
| `LLM_OPENAI_TOKEN_PARAM` | `max_tokens` 或 `max_completion_tokens` | `max_tokens` |
| `GENMENTOR_LLM_MODE` | `live` / `record` / `replay` | `live` |
| `GENMENTOR_LLM_FIXTURES` | fixture 目录 | `../e2e/fixtures/llm` |
| `TAVILY_API_KEY` | 可选，起草与导师对话的外部资源检索 | 不检索 |

## 部署

| 方式 | 做法 |
|---|---|
| 本地 | `make install && make dev`，只需 `app/.env.local` 里一个 LLM key |
| Vercel | 项目 `gen-mentor`（team geminilights-projects），主域名 https://genmentor.aurax.live （旧地址 https://gen-mentor.vercel.app 保留用于原浏览器档案访问） ，Root Directory `app`，GitHub `main` 推送自动部署。生产环境不配任何 LLM 变量，访客自带 key（顶部横幅引导）。预览部署开着 Vercel Authentication，生产别名公开 |
| 容器 | `docker build -t genmentor app/`，`docker run -p 3000:3000 --env-file app/.env.local genmentor`；镜像用 `.next/standalone` 单进程 |

`GENMENTOR_LLM_MODE=replay` 加 `e2e/fixtures/llm` 可以在没有 key 的机器上完整演示已录制的旅程。

## 学习状态与恢复（2026-09-09 精修）

`SessionState.quiz_draft` 保存选择、简答与确认顺序，交卷后移除草稿，保留权威结果；
`reading_anchor` 保存最近章节。两者随档案导出导入。界面和画像证据的自动正确率仅用
correct / incorrect 两种 verdict 作分母，简答题显示待自评，无可评分题时 accuracy 为 null。

创建目标草稿单独保存在 `genmentor.onboarding.v1`，包含表单和已成功的阶段结果；再次提交
相同输入从 checkpoint 继续，修改输入重新生成。完成创建和删除全部学习数据都会清理此草稿。

重排在一次 store 更新内同时替换路径并重新绑定 session：课程标题、摘要、关联技能和预期成果
均一致才复用文档与测验。重排若改变或移除已完成课程会拒绝整次更新。当前仍使用索引 URL；
跨目标稳定书签和稳定课程 UUID 另见 backlog，未声称本轮完成了身份迁移。

导入通过 `schemas/archive.ts` 深校验，并检查目标 ID 唯一性、active_goal_id、session 归属及索引。
已有目标时先预览替换数量，允许备份与取消；空档案可以直接恢复。模型返回的数据 schema 继续复用。
教材与测验分别表达就绪状态，出题失败不会阻塞已经保存的教材。

创建目标现在分为分析、确认、生成三段：目标精炼与技能分析完成后，必须进入本地确认步骤，
画像和路径请求在手动确认或 3 分钟截止后才发出。checkpoint 的 `review` 保存截止时间和未保存的
目标编辑内容，`done.confirmed` 标记当前分析是否已确认；刷新恢复同一截止时间，不偷偷重新计时。
手动调整当前/目标水平同步重算 `is_gap` 和技能要求，已确认数据用于画像请求并写入最终档案。
编辑目标暂停截止时间；保存新目标保留原始输入，直接以用户修订版重跑技能分析、画像与路径，
不再用目标精炼器改写用户修订。每次重启递增运行标识，过期响应不得写入状态、档案或跳转页面。

AppShell 只挂载一个按目标 ID 隔离的导师会话，桌面和手机入口共享它。展示模式与展开状态
由 `genmentor.tutor-panel.v1` 独立保存；刷新只恢复已固定且展开的面板。会话 hook 持有草稿、
请求与流式文本，抽屉/固定侧栏仅改变展示容器。切换目标卸载旧会话并中止旧请求。

主域名 DNS 由 Cloudflare 管理：`genmentor` CNAME 指向 Vercel 分配的
`11e1c9bf0df68f4a.vercel-dns-017.com`，采用 DNS-only；2026-09-10 验证与 HTTPS 访问通过。
学习档案和模型配置按浏览器 origin 隔离。切换域名时从旧站导出学习档案、在新站导入，
模型凭证在新站重新配置，因此旧站暂不强制跳转。后续 main 部署继续绑定新主域名。
