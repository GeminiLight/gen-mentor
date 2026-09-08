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
