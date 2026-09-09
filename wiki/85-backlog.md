<!-- Last verified: 2026-09-09 -->

# Backlog

- [ ] 模型选择器：`/api/health` 只暴露 fast / smart 两个名字。若要在界面里切换模型，需要一个列表接口与档案里的偏好。
- [ ] profiler 的 `overall_progress` 在同一输入下方差很大（评测里 20 对 60）。应改为由掌握度与会话完成度派生，模型只负责技能级别。见 `wiki/reviews/review-2026-09-09-prompt-eval.md`。
- [ ] 输出格式说明从 zod schema 生成，替代 prompt 里手写的示例 JSON。需要先有对照评测。
- [ ] profiler 的 `behavioral_patterns` 在 init 时是编造的（"每周登录 4 次""对徽章有反应"）。界面已改为只显示档案派生的真实活动（`derive.ts#activitySummary`），但这段文字仍随画像发回模型。prompt 层应让 init 输出"尚无记录"，或由代码把 `activitySummary` 写回画像再发；改 prompt 需重录 fixture。
- [ ] `sessionMinutes` 只有打开与完成两类时间戳，同一次坐下超过 90 分钟不再计入。要更准需要记录离开时刻（`visibilitychange`），代价是档案多一类事件。

