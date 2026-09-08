<!-- Last verified: 2026-09-09 | Current stage: M0 -->

# API 参考

全部 route 在 `app/src/app/api/`。POST 入参必须经 zod 校验，失败返回 400 并附 `issues`。
错误统一为 `{ error: string }`，状态码由 `toHttpError` 决定（401 凭证、429 限流、503 不可达、
422 模型拒答、502 输出不可解析）。

## 已实现

| 方法 | 路径 | 用途 | 档位 | 返回 |
|---|---|---|---|---|
| GET | `/api/health` | 部署是否有模型、运行模式、模型名。不含任何凭证 | 无 | JSON |

## 计划（M1）

| 方法 | 路径 | 对应 agent | 档位 | 返回 |
|---|---|---|---|---|
| POST | `/api/refine-goal` | Goal Refiner | fast | JSON |
| POST | `/api/identify-skill-gap` | Skill Gap Identifier | smart | JSON |
| POST | `/api/profile` | Adaptive Learner Modeler | fast | JSON |
| POST | `/api/schedule-path` | Learning Path Scheduler | smart | 流式 JSON |
| POST | `/api/explore-knowledge` | Knowledge Explorer | smart | JSON |
| POST | `/api/draft-knowledge` | Knowledge Drafter | smart | 流式文本 |
| POST | `/api/integrate-document` | Document Integrator | smart | 流式文本 |
| POST | `/api/generate-quiz` | Quiz Generator | fast | JSON |
| POST | `/api/evaluate` | Performance Evaluator | smart | 流式文本 |
| POST | `/api/tutor` | AI Chatbot Tutor | fast | 流式文本 |

## 流式协议

`Content-Type: text/plain`。正文是模型输出的增量文本。结束时可追加
`\n@@final\n<json>` 作为权威结构化结果；中途失败追加 `\n@@error\n<message>`。
