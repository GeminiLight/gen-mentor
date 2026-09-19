<!-- Last verified: 2026-09-09 | Current stage: M1 -->

# API 参考

全部 route 在 `app/src/app/api/`，请求体 schema 在 `app/src/lib/schemas/`，浏览器端也从
那里 import，两侧不会漂移。POST 入参经 `parseBody` 校验，失败返回 400 并附 zod `issues`。
错误统一为 `{ error: string }`，状态码由 `toHttpError` 决定：401 凭证、429 限流、503 不可达、
422 模型拒答、502 输出不可解析或两次校验失败。

## 路由

| 方法 | 路径 | agent | 档位 | 返回 | maxDuration |
|---|---|---|---|---|---|
| GET | `/api/health` | 无 | 无 | `{ ok, provider, serverKey, source, mode, models }`，不含凭证；带 `x-genmentor-llm` 头时反映学习者的配置 | 默认 |
| POST | `/api/models` | 无（元数据） | 无 | 显式 BYOK body → `{ models: [{ id, name? }], truncated }`；不读取服务端密钥 | 15 |
| POST | `/api/health` | 无 | fast | 用 `x-genmentor-llm` 头里的凭证做一次 ping，返回 `{ ok, reply, ms, model }` | 60 |
| POST | `/api/refine-goal` | Goal Refiner | fast | `{ refined_goal }` | 60 |
| POST | `/api/identify-skill-gap` | Skill Mapper 加 Skill Gap Identifier | smart | `{ skill_gaps, skill_requirements }`；传入 `skill_requirements` 可跳过 mapper | 120 |
| POST | `/api/profile` | Adaptive Learner Profiler | fast | `{ learner_profile }`；`mode: init` 或 `update` | 120 |
| POST | `/api/schedule-path` | Learning Path Scheduler | smart | 流式，`@@final` 为 `{ learning_path }`；`task: create` / `refine` / `reschedule` | 180 |
| POST | `/api/explore-knowledge` | Knowledge Explorer | smart | `{ knowledge_points }` | 120 |
| POST | `/api/draft-knowledge` | Knowledge Drafter | smart | 流式，`@@final` 为 `{ title, content, sources }` | 180 |
| POST | `/api/integrate-document` | Document Integrator | smart | 流式，`@@final` 为 `{ structure, markdown }` | 180 |
| POST | `/api/generate-quiz` | Quiz Generator | fast | `{ document_quiz }` | 120 |
| POST | `/api/simulate-feedback` | Learner Feedback Simulator | fast | `{ feedback, suggestions }`；`target: path` 或 `content` | 120 |
| POST | `/api/tutor` | AI Chatbot Tutor | fast | 纯文本流 | 60 |
| POST | `/api/parse-resume` | 无（unpdf） | 无 | multipart `file` → `{ text, pages }`；PDF 之外按纯文本读 | 30 |

Performance Evaluator 不在这份实现里。当前仓没有这个 agent 的 prompt（只有 KiddleMentor 有），
而 profiler 的 update 任务本身接收 `quiz_performance` 并据此更新认知状态，这就是论文里评估反馈进
入学习者模型的路径。

## 创建路径的课程数

`POST /api/schedule-path` 的 `task: "create"` 下，`session_count: 0` 或省略表示 Adaptive，模型根据目标、技能差距和偏好选择 1–10 课；指定正整数时沿用固定课数规则。创建目标表单默认 Adaptive，草稿保留用户手动选择。重排路径的 `-1` 语义保持不变。

## 请求头

`x-genmentor-llm`：JSON，`{ provider, apiKey, baseUrl?, fastModel?, smartModel?, disableThinking? }`。生成 POST 路由接受，缺省用服务端配置。`/api/models` 例外：仅接受请求体里的显式凭证。

## 流式协议

`Content-Type: text/plain`。正文是模型输出的增量文本，客户端用 `parsePartialJSON` 边收边渲染。
结束时追加 `\n@@final\n<json>` 作为权威结构化结果；中途失败追加 `\n@@error\n<message>`，
因为响应头已经发出。

## 校验修复语义

zod schema 逐一对应原 Pydantic 模型的"修复而非拒绝"策略：技能列表按名字去重并截到 10 个，
`is_gap` 由两个等级重新推导，`reason` 截到 20 词，`overall_progress` 夹到 0 到 100，学习路径
截到 10 个会话。空列表仍然是错误。校验失败时 `runJSON` 带着 issue 文本再问模型一次，第二次仍失败
才返回 502。

## 外部资源

`draft-knowledge` 与 `tutor` 可选走 Tavily 搜索（`TAVILY_API_KEY`），结果按 `[N]` 编号注入
prompt，同一编号成为 `sources`。没有 key 时不注入，prompt 自身要求此时不写引用标记。replay 模式
下不搜索，因为搜索文本参与 fixture 哈希。

## 模型列表（2026-09-19）

`POST /api/models` 使用 `schemas/model-catalog.ts` 的 schema，接收 `{ provider, apiKey, baseUrl? }`。
只使用本次表单传入的密钥；忽略已保存配置请求头，不退回服务端凭证，不发起生成调用。
OpenAI 兼容端点在配置地址后追加 `/models`；Anthropic 按 SDK 的 API 根地址追加 `/v1/models`。
请求不跟随重定向，整体超时 10 秒，响应 `Cache-Control: no-store`。校验错误为
`invalidConnection`（400），供应商拒绝凭证为 `unauthorized`（401），限流为 `rateLimited`
（429），其余失败为 `unavailable`（502）；不透传或记录供应商响应、地址或密钥。

列表按 ID 去重排序，剔除不能保存的 ID；最多 3000 个。Anthropic 每页请求 1000 个、最多三页，
未读完以 `truncated` 标记。列表包含供应商返回的模型种类，UI 提醒选择文本模型；列出不等于测试通过。
模型列表请求不使用生成录制/回放，回归测试在浏览器和单元层模拟供应商响应。

协议依据：[OpenAI Models](https://developers.openai.com/api/reference/resources/models/methods/list)、
[Anthropic Models](https://platform.claude.com/docs/en/api/models/list)。
