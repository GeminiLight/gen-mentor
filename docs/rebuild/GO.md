# GO：把 GenMentor 重做成一个 Next.js 单体应用，UI 与游戏性都要碾压现版

本文件是当前阶段的任务目标。常驻约束在 `AGENTS.md`，两份都要读完再动手。

## 任务

现在的 GenMentor 是 Streamlit 前端加 FastAPI 后端。新版本是一个应用，不是前后端分离。
LLM 调用发生在 Next.js 的 API routes 里，Python 全部删除。

Streamlit 那层的问题是结构性的，不是写得不好。`frontend/` 里有 37 处 `st.rerun()`，每次
交互都是整页重跑；`assets/css/main.css` 里有 57 处针对 Streamlit 内部 `data-testid` 的
`!important` 覆盖，每一点视觉精细度都在跟框架 DOM 打架；`views/knowledge_document.py`
一个文件 1055 行，因为 Streamlit 没有组件边界。在这个地基上做不出想要的 UI。

## 已定的前提

不要重新讨论这五条。

一个 Next.js 单体应用，代码在 `app/`，仓库根只有文档。Python 内核删除，论文复现指向旧的
git 标签，README 里说清楚。

无账号、无服务端数据库、无付费。学习档案留在设备上并且可导出可导入。

受众是职业与终身学习者，设计语言专业克制，儿童向的一切都丢弃。

游戏性是产品支柱之一，不是装点。它的作用是让人看见自己真实的进步，因此每个游戏化元素背后
都必须有真实学习数据支撑。

部署以本地一键启动为主，前端能上 Vercel，也能打成单进程容器。

## 从哪里搬什么

### 从当前仓搬 prompts 与数据契约

`backend/modules/*/prompts/*.py` 是九个 agent 的 prompt 文本，逐字搬到
`app/src/lib/prompts/`。只允许把 Python 的 `str.format` 占位换成模板字符串，文本一个字
不能改。

这条约束只管 M1。这些 prompt 确实有该改的地方，优化是 M6 的事，前提是先有一个能跑通的
baseline 用来对照。没有对照的 prompt 优化没法判断是变好还是变差。

`backend/modules/*/schemas.py` 与 `backend/base/dataclass.py` 是 Pydantic 模型，机械转成
`app/src/lib/schemas/` 里的 zod。字段名、可选性、默认值一一对应，不要顺手"优化"。

搬之前注意 `GeminiLight/KiddleMentor-dev` 里的同名 prompts 已经漂移过，方向还不一致：
它的 `path_scheduling` 丢掉了当前仓有的会话数区间钳制和 `session_count` 入参，换成注入
`learning_goal`；它的 `chatbot` 多注入了 `learning_goal`；`goal_refinement` 两边一致。
一律以当前仓 `backend/modules/` 为准，不要拿 KiddleMentor 的版本。

### 从 KiddleMentor-dev 只搬信息架构

它的页面清单和每页放什么可以参考（goals、learning-path、library、profile、progress、
session、onboarding）。组件和页面代码一行都不要，那些文件 17 到 30KB 一个，没有组件原语层。

### 从 SocialCoach 借鉴实现思想

`~/projects/research/SocialCoach` 是同一个作者的单体 Next.js 应用，已经把这条路走通了。
不要复制它的业务代码，要借鉴它解决过的问题。

`app/src/lib/llm-core.ts` 211 行就把双 provider 适配、结构化输出、流式全解决了。其中
`openaiArgs()` 的 `disableThinking` 参数处理的正是我们网关的 reasoning 模型问题，
`extractJSON()` 处理的正是网关不支持 `output_config.format` 的问题。

`app/src/lib/llm.ts` 的 fast 与 smart 双模型路由，按任务分配模型。

`app/src/lib/partial-json.ts` 111 行做流式部分 JSON 解析。这是十秒级 agent 调用的正解，
边生成边渲染，比引入任务队列和 SSE 简单得多，而且在 Vercel 上直接能跑。

`app/src/app/globals.css` 用 OKLCH 定义全部色值并且是唯一来源。
`wiki/03-design-principle.md` 里"每一个宽度都必须是 token 之一，不要写魔数"的做法照搬。

`Radar.tsx`、`SkillBits.tsx`、`Footprint.tsx` 是游戏化组件的形态参考。

它的 `AGENTS.md` 里"项目专有约束"那一节写的是产品定位级别的约束而不是代码风格，
这个模式已经吸收进我们的 `AGENTS.md`。

## agent 到 API route 的映射

九个 agent 对应以下 route，模型档位按成本与质量分配。这张表是 `wiki/04-api-reference.md`
的起点，实现时同步更新它。

| route | 对应 agent | 档位 | 返回 |
|---|---|---|---|
| `POST /api/refine-goal` | Goal Refiner | fast | JSON |
| `POST /api/identify-skill-gap` | Skill Gap Identifier | smart | JSON |
| `POST /api/profile` | Adaptive Learner Modeler | fast | JSON |
| `POST /api/schedule-path` | Learning Path Scheduler | smart | 流式 JSON |
| `POST /api/explore-knowledge` | Knowledge Explorer | smart | JSON |
| `POST /api/draft-knowledge` | Knowledge Drafter | smart | 流式文本 |
| `POST /api/integrate-document` | Document Integrator | smart | 流式文本 |
| `POST /api/generate-quiz` | Quiz Generator | fast | JSON |
| `POST /api/evaluate` | Performance Evaluator | smart | 流式文本 |
| `POST /api/tutor` | AI Chatbot Tutor | fast | 流式文本 |
| `GET /api/health` | 无 | 无 | JSON |

## 里程碑

一次只做一个。退出条件是可执行命令，跑到绿才算完成。每个里程碑结束时应用都必须能跑起来。

### M0 骨架与闸门通路，不写业务功能

建立 `app/` 的 Next 16 工程，装好 Tailwind v4、shadcn、zod、zustand、`motion/react`。
`src/lib/llm-core.ts` 先做出来，必须包含 reasoning 模型的 token 预算处理、可选的关思考、
宽松 JSON 提取、流式部分 JSON 解析。`/api/health` 打通。`wiki/` 建起 `00` 到 `04` 与
`80`、`85` 的骨架。`e2e/` 建好 Playwright 工程，含从 `app/src/app` 反推路由、按 3 视口
2 主题采集截图的 spec，以及 axe 断言。`.github/workflows/gate.yml` 跑 `make gate`。

同时做掉 LLM 回放模式，这是 E2E 能长期可用的前提。`GENMENTOR_LLM_MODE` 取三个值：
`live` 真调，`record` 真调并把请求响应落到 `e2e/fixtures/llm/<hash>.json`，`replay`
只读 fixture，命中不到直接报错而不是回退到真调。回放层做在 `src/lib/llm.ts` 一处，
agent 代码不感知。`make verify-ui` 默认用 `replay`。

退出闸门 `make gate` 与 `make verify-ui` 全绿。

### M1 LLM 层与九个 agent

prompts 逐字搬完，schema 转完 zod，上表十个 route 全部实现并接上 fast/smart 路由。
每个 agent 配一个 zod 往返测试和一个 fixture 回放测试。流式的四个 route 必须真的边生成
边输出，不是等完了一次性返回。

退出闸门 `make gate` 绿，且十个 route 在 `replay` 模式下全部通过。通过后打标签
`git tag prompts-baseline`，M6 的评测脚本靠它取逐字版 prompt 做对照，所以这个标签不能删。

### M2 设计系统

色值用 OKLCH 在 `globals.css` 一处定义，明暗双主题。宽度、间距、圆角、动效时长全部
token 化，组件里不出现魔数。补齐 `src/components/ui/` 原语：Button、Input、Textarea、
Select、Card、Dialog、Sheet、Tabs、Tooltip、Badge、Progress、Skeleton、Toast、Table、
Command。加 `/_design` 路由把全部原语和每种状态排开，作为视觉回归靶子。

退出闸门 `make gate` 绿（硬编码颜色命中必须为 0），`make verify-ui` 绿，
axe 零 serious 与 critical。

### M3 核心旅程与本地档案

onboarding（目标输入与简历上传，简历用 `unpdf` 一类在浏览器或 route 里解析）、goals、
learning-path 含重排、session 的学习文档阅读与测验、library、progress、profile、
AI tutor。档案用 zustand 的 `persist` 存 localStorage，提供导出与导入。

退出闸门 每条旅程一个 Playwright spec 真跑通，`make verify-ui` 绿，导出的档案能重新导入
并还原到同一状态。

### M4 游戏化层

见下面的游戏化设计原则。技能树、掌握度环、测验即时判定与连击、学习足迹。

退出闸门 `make verify-ui` 绿，且新增一个 spec 断言每个游戏化组件在档案为空时呈现合理的
空态、在有真实数据时呈现的数值与档案里的记录一致。写死的假数据会让这个断言失败。

### M5 精致度与部署

动效、空态、错误态、键盘可达、命令面板、乐观更新。学习文档阅读页是核心页面，按长文阅读
标准做排版。部署上 Vercel 能跑，也能用一个 Dockerfile 打成单进程容器。

退出闸门 `make verify-ui` 绿；新增一个 spec 断言每个异步边界在 200ms 内出现 skeleton
或乐观态，不允许空白等待；clone 到临时目录 `make install && make dev` 通；`vercel build` 通。

### M6 prompt 优化，必须有对照

到这里应用已经稳定，可以动 prompt 了。工作树里始终只保留一份 prompt，baseline 从
`prompts-baseline` 标签用 `git show <tag>:app/src/lib/prompts/<file>` 取，不在工作树里
维护第二套。

已经识别出的改动方向，实现时逐条判断是否适用：

删掉给模型打鸡血的句子。`skill_gap_identifier.py` 里"You have excellent reasoning
skills"、"Excel at Inference"这类话是为非 reasoning 模型写的，对当前网关的模型没有作用，
只是白烧本来就紧张的 token 预算。

输出格式说明从 zod schema 生成，不再内联示例 JSON。现在的写法是 prompt 里手写一段示例，
schema 改了 prompt 不会跟着改，迟早漂移。

枚举约束交给 zod。`current_level must be one of "unlearned"/"beginner"/...` 这种事靠
prompt 祈求不如靠解析失败重试，prompt 里不必重复一遍。

派生字段在代码里算。`is_gap` 是 `current_level` 低于 `required_level` 的纯函数，让 LLM
输出它既费 token 又可能算错。

删掉被宽松解析器接管的约束。既然用 `extractJSON()` 剥代码围栏，
`Do NOT include markdown tags` 就是噪音。

建 `e2e/fixtures/eval/` 放一组固定输入，至少五个学习目标各配一份简历文本。写
`scripts/eval-prompts.sh`，在 `live` 模式下用 baseline 与当前两套 prompt 各跑一遍全部
agent，输出落到 `e2e/artifacts/eval/{baseline,current}/<case>--<agent>.json`。

退出闸门 两套输出齐全，并且有一份 `wiki/reviews/review-<日期>-prompt-eval.md` 逐个 agent
逐个用例并排对比、明确写出哪些变好哪些变差以及为什么。只跑了优化版、或者只有结论没有并排
输出，都算没做完。改差了的 prompt 要回退，不许因为"整体上更好"就留着。

### M7 收尾

删掉 `frontend/` 与 `backend/`，重写 README 并注明论文复现指向哪个 git 标签，开 PR。

退出闸门 `GATE_FINAL=1 make gate` 绿。

## 游戏化设计原则

这一节是产品定位，违反了就是定位问题不是风格问题。

现有系统已经在产出游戏化需要的全部数据，不需要新造。`backend/utils/state_store.py` 里躺着
`mastery_history` 的掌握度时序、`quiz_results`、`session_learning_times`，加上 learning
path 的 session 序列和知识点完成状态。这些是被 Streamlit 浪费掉的素材。

每个游戏化元素背后必须有真实数据支撑，能追溯到具体的学习记录。做不到就不做这个元素。

技能树用 skill gap 的输出驱动。那个 agent 本来就输出"技能加所需水平对比当前水平"，天然是
树状结构，节点点亮由掌握度变化驱动，不是手动标记。

掌握度用环形而不是进度条，因为它是多技能同时推进而不是单一线性进度。

测验做即时判定与单次测验内的连击。不做跨天连续登录奖励。

学习足迹用 `session_learning_times` 的真实时间做可视化。

明确不做：登录奖励、虚拟货币、排行榜（无账号本来也做不了）、与学习行为无关的成就徽章。
受众是职业学习者，廉价徽章直接削弱专业可信度。

反馈必须即时。agent 调用慢的地方靠流式和阶段性文字进度补偿，让人看到系统在做什么。

## 设计方向

做设计决策前加载 `super-designer` skill，画图表前加载 `dataviz` skill。以下是边界。

参照 Linear、Vercel、Raycast 的克制。信息密度可以高，但要有呼吸感。

一套中性灰阶加单一强调色。强调色只用于当前进度和主行动，用在第三处就说明它不该是强调色。

字号阶梯不超过 6 级，字重不超过 3 种。正文行宽 62 到 75 字符，行高 1.7。

动效只服务于状态连续性，时长 120 到 240 毫秒，必须尊重 `prefers-reduced-motion`。

每个异步边界必须有 skeleton，禁止占满页面的 spinner。

明暗两套主题都是一等公民，不允许其中一套明显更粗糙。

## 已知的失败模式

这些在 KiddleMentor-dev 里都真实发生过，仓库里留着痕迹。

用 markdown 汇报冒充进度。那个仓根目录躺着五个计划与总结文档，十五个 commit 全叫 `update`。
`gate.sh` 会因为不符合 wiki 编号方案的 markdown 直接判失败。有结构的 wiki 是鼓励的，
随手扔的 `PLAN.md` 不是。

自评 UI 好看却从没打开过浏览器。`verify-ui.sh` 的截图覆盖率从实际存在的 `page.tsx` 反推，
缩小清单绕不过去。

游戏化做成写死的假数据。M4 的退出闸门专门断言数值与档案记录一致。

把 prompt 改差了还自称优化。M6 的退出闸门要求并排输出，没有 baseline 对照的优化主张
一律不接受。

为了绿灯放宽闸门。`gate.sh` 与 `verify-ui.sh` 的阈值是契约，要改就停下来说明理由等确认。

一次干太多，卡住时留下半个迁移。里程碑已经切成每步都能跑起来的状态，按顺序走。

凭记忆写 Next.js 16。它与训练数据差异很大，`app/AGENTS.md` 会指向
`node_modules/next/dist/docs/`，写代码前读它。

## 怎么跑

单步推进：

```
/model claude-fable-5-1
读 AGENTS.md 与 docs/rebuild/GO.md，找到第一个未完成的里程碑，只做那一个。
做完跑 make gate 与 make verify-ui，全绿后按 Conventional Commits 提交，然后停下来汇报。
```

连续推进：

```
/loop 读 AGENTS.md 与 docs/rebuild/GO.md，找到第一个未完成的里程碑，只做那一个，
跑 make gate 与 make verify-ui 到全绿，提交后继续下一个。闸门红了就修代码，
不要改闸门。全部里程碑完成后停下。
```
