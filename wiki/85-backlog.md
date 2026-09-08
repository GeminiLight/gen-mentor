<!-- Last verified: 2026-09-09 -->

# Backlog

- [ ] `backend/.env` 里的 `...` 占位 key 是真值，会被 `searcher_factory.py` 当有效 key 使用。旧树在 M7 删除，之前不要复用那个文件。
- [ ] 旧 `/list-llm-models` 只返回配置里的一个模型。新版若要做模型选择器，需在 `/api/health` 之外提供列表。
- [ ] profiler 的 `overall_progress` 在同一输入下方差很大（评测里 20 对 60）。应改为由掌握度与会话完成度派生，模型只负责技能级别。见 `wiki/reviews/review-2026-09-09-prompt-eval.md`。
- [ ] 输出格式说明从 zod schema 生成，替代 prompt 里手写的示例 JSON。需要先有对照评测。
