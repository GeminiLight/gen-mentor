<!-- Last verified: 2026-09-09 | Current stage: M1 -->

# API 参考

全部 route 在 `app/src/app/api/`，请求体 schema 在 `app/src/lib/schemas/requests.ts`，浏览器端也从
那里 import，两侧不会漂移。POST 入参经 `parseBody` 校验，失败返回 400 并附 zod `issues`。
错误统一为 `{ error: string }`，状态码由 `toHttpError` 决定：401 凭证、429 限流、503 不可达、
422 模型拒答、502 输出不可解析或两次校验失败。

## 路由

| 方法 | 路径 | agent | 档位 | 返回 | maxDuration |
|---|---|---|---|---|---|
| GET | `/api/health` | 无 | 无 | `{ ok, provider, serverKey, mode, models }`，不含凭证 | 默认 |
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

Performance Evaluator 不在这份实现里。当前仓没有这个 agent 的 prompt（只有 KiddleMentor 有），
而 profiler 的 update 任务本身接收 `quiz_performance` 并据此更新认知状态，这就是论文里评估反馈进
入学习者模型的路径。

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
