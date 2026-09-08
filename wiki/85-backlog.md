<!-- Last verified: 2026-09-09 -->

# Backlog

- [ ] `backend/.env` 里的 `...` 占位 key 是真值，会被 `searcher_factory.py` 当有效 key 使用。旧树在 M7 删除，之前不要复用那个文件。
- [ ] 旧 `/list-llm-models` 只返回配置里的一个模型。新版若要做模型选择器，需在 `/api/health` 之外提供列表。
