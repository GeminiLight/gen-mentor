# AGENTS.md

GenMentor 是 LLM 驱动的目标导向学习教练。应用在 `app/`（Next.js 单体），仓库根只有文档。
本文件是常驻约束，当前阶段任务在 `wiki/01-project-roadmap.md` 与 `docs/rebuild/GO.md`。

## 入口

动 `app/` 里的代码前先读 `app/AGENTS.md`。Next.js 16 与训练数据差异很大，那份文件由
`next dev` 自动写入并维护，它会指向 `node_modules/next/dist/docs/` 里的真实文档。
不要凭记忆写 Next.js 代码，也不要因为它是自动生成就从 diff 里删掉它。

改架构或数据流读 `wiki/02-system-architecture.md`，改 UI 读 `wiki/03-design-principle.md`，
改 API 读 `wiki/04-api-reference.md`，修 bug 先扫 `wiki/80-known-pitfalls.md`。

## 一句话定位

WWW 2025 论文 *LLM-powered Multi-agent Framework for Goal-oriented Learning in
Intelligent Tutoring System* 的产品化实现。交付一个无账号、无服务端存储、单机可跑的
学习教练，视觉与交互达到商业产品水准，面向职业与终身学习者，不面向儿童。

## 架构

一个应用，不是前后端分离。LLM 调用发生在 Next.js 的 API routes 里，没有独立后端进程。

```
gen-mentor/
├── AGENTS.md
├── Makefile                    # make dev / gate / verify-ui
├── app/                        # 唯一的应用
│   ├── src/app/                #   路由与页面装配
│   │   └── api/*/route.ts      #   LLM 调用的唯一入口
│   ├── src/components/ui/      #   shadcn 原语，代码归我们所有
│   ├── src/features/<domain>/  #   按领域切分的业务组件
│   └── src/lib/
│       ├── llm-core.ts         #   provider 适配、结构化输出、流式
│       ├── llm.ts              #   fast / smart 双模型路由
│       ├── prompts/            #   全部 prompt 文本的唯一来源
│       ├── schemas/            #   zod，全系统唯一的数据契约
│       ├── agents/             #   九个 agent 的编排
│       └── store/              #   zustand + persist，可导出
├── wiki/                       # 项目 wiki，编号见下
├── e2e/                        # Playwright 旅程与视觉证据
└── scripts/{gate,verify-ui}.sh
```

## 技术选型

选型已定，不要替换。清单外的依赖先停下来问人。

Next.js 16 App Router、React 19、TypeScript strict、Tailwind v4（CSS-first `@theme`，
不写 `tailwind.config.js`）、shadcn/ui、`motion/react`、zod 4、zustand 5 加 `persist`、
`react-markdown` 加 `remark-gfm` 加 `shiki`、`sonner`、Recharts、Playwright 加
`@axe-core/playwright`、pnpm。

LLM 用 `openai` 与 `@anthropic-ai/sdk` 两个官方 SDK，不引入 langchain。默认走
OpenAI 兼容端点，凭证读 `OPENAI_API_KEY` 与 `OPENAI_BASE_URL`。模型分快慢两档，
`LLM_FAST_MODEL` 给对话、提示、目标精炼，`LLM_SMART_MODEL` 给路径规划、内容生成、
复盘报告。动手改 LLM 调用前加载 `claude-api` skill，不要凭记忆写参数。

## 已知的网关行为，不要重新踩

当前网关默认模型 `glm-5.3-flash` 是 reasoning 模型，思考会先吃掉 token 预算，预算不够时
返回空字符串而不是报错。所有调用给足 `max_tokens`，需要关思考时传
`thinking: {type:"disabled"}`，并且做成 opt-in，因为官方 OpenAI 端点会拒绝这个字段。

网关不支持 `output_config.format`。结构化输出一律在 prompt 里要求 JSON，再用宽松解析器
提取，解析器要能剥掉代码围栏和前后废话。不要用 SDK 的 structured output 能力。

流式渲染用部分 JSON 解析，边生成边出内容。agent 调用是十秒级的，这是这个产品体验上
最难的地方，不能用一个转圈糊过去。

## 硬约束

违反即视为任务失败，不是风格建议。

不引入账号体系、服务端数据库、消息队列、付费、遥测上报。学习档案留在设备上并且可导出可导入。
`gate.sh` 会检查 `package.json` 里有没有出现这类依赖。

不在 API route 之外调 LLM，不在 route 里直接实例化 SDK 客户端，一律走 `src/lib/llm`。

不在 `src/lib/prompts/` 之外写 prompt 文本。route 和组件里不出现提示词字符串。

API route 的入参必须经过 zod 校验才使用。

不硬编码颜色。色值只在 `app/src/app/globals.css` 用 OKLCH 定义，组件里一律用语义 token。
对外 SVG 需要 hex 时用脚本换算，不手调。

游戏化元素背后必须有真实数据支撑。掌握度、连击、足迹、技能树的每一个视觉状态都要能追溯到
真实的学习记录。装饰性的连续天数和空洞成就徽章不做。受众是职业学习者，廉价徽章削弱可信度。

不新增计划类、总结类、进度类 markdown。项目文档走下面的 wiki 编号方案，随手扔的
`PLAN.md`、`SUMMARY.md`、`*_COMPLETE.md` 会被 `gate.sh` 判失败。

不修改 `scripts/gate.sh` 与 `scripts/verify-ui.sh` 的任何阈值或检查项来让自己通过。
需要改动时停下来说明理由等确认。

不用 `--no-verify`，不 skip 或删除现存测试来换绿灯。

commit message 用 Conventional Commits，禁止 `update`、`wip` 这类无信息标题。

## Wiki 编号

紧凑编号，`0x` 战略与架构，`1x` 阶段，`8x` 运维，`9x` 归档产物。不要引入 `2x` `3x` `6x`。

| 做了这件事 | 更新 |
|---|---|
| 新增或修改 API route | `wiki/04-api-reference.md` |
| 完成一个 stage 内的功能 | `wiki/01-project-roadmap.md` 对应行状态 |
| 架构或数据流变更 | `wiki/02-system-architecture.md` |
| 新增设计 token 或动效 | `wiki/03-design-principle.md` |
| 踩到非显而易见的坑 | `wiki/80-known-pitfalls.md`，写现象、原因、解法、教训 |
| 发现 bug 或技术债 | `wiki/85-backlog.md` |
| 阶段全部交付 | `wiki/90-changelog.md` |

功能复杂到一句话说不清就新建 `wiki/1X-stage-X.md`，小功能需要边界和验收就写
`wiki/specs/spec-{name}.md`，外部机制被查阅两次以上就记 `wiki/refs/{topic}.md`。
spec 完成后 `git mv` 到 `wiki/archive/specs/`。

## 体量预算

`gate.sh` 强制以下上限，超了就拆。旧代码里有 1055 行的 Streamlit 视图和 30KB 的单文件
React 页面，这条存在就是为了防止复发。

`src/app/**/page.tsx` 不超过 120 行，页面只做数据获取与组装。`route.ts` 不超过 120 行，
业务逻辑放 `lib/agents/`。其他 `.tsx` 不超过 220 行，`.ts` 不超过 300 行。

## 命令

```bash
make dev          # 起应用
make gate         # 静态闸门：布局、文档、预算、禁止形态、定位守卫、类型、lint、构建
make verify-ui    # 起服务后跑 Playwright 旅程、axe a11y、三视口双主题截图
```

## 工作方式

先读 `docs/rebuild/GO.md`，找到第一个未完成的里程碑，只做那一个。退出条件是机器可判定的，
跑命令拿到绿灯才算完成，不要用自述替代验证。

UI 质量不能靠想象判断。做完视觉改动必须真开浏览器截图看，用 `agent-browser` skill 或
`make verify-ui`。做设计决策前加载 `super-designer` skill，画图表前加载 `dataviz` skill。

卡住就停下来说清楚卡在哪，不要绕过闸门、不要降低目标、不要留半个迁移。
