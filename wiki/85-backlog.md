<!-- Last verified: 2026-09-09 -->

# Backlog

- [ ] 模型选择器：`/api/health` 只暴露 fast / smart 两个名字。若要在界面里切换模型，需要一个列表接口与档案里的偏好。
- [ ] profiler 的 `overall_progress` 在同一输入下方差很大（评测里 20 对 60）。应改为由掌握度与会话完成度派生，模型只负责技能级别。见 `wiki/reviews/review-2026-09-09-prompt-eval.md`。
- [ ] 输出格式说明从 zod schema 生成，替代 prompt 里手写的示例 JSON。需要先有对照评测。
