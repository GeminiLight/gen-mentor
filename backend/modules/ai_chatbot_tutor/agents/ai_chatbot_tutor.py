from __future__ import annotations

import ast
from typing import Any, List, Mapping, Optional, Sequence

from pydantic import BaseModel, field_validator

from base import BaseAgent
from base.search_rag import SearchRagManager, format_docs
from modules.ai_chatbot_tutor.prompts.ai_chatbot_tutor import (
	ai_tutor_chatbot_system_prompt,
	ai_tutor_chatbot_task_prompt,
)


def _stringify_history(messages: Any) -> str:
	if messages is None or len(messages) == 0:
		return ""
	if isinstance(messages, str):
		try:
			messages = ast.literal_eval(messages)
		except Exception:
			return messages
	lines: List[str] = []
	for m in list(messages or []):
		if isinstance(m, Mapping):
			role = str(m.get("role", "user"))
			content = str(m.get("content", ""))
		else:
			role = "user"
			content = str(m)
		lines.append(f"{role}: {content}")
	return "\n".join(lines)


def _last_user_query(messages: Any) -> str:
	if messages is None:
		return ""
	if isinstance(messages, str):
		try:
			messages = ast.literal_eval(messages)
		except Exception:
			return messages
	for m in reversed(list(messages or [])):
		if isinstance(m, Mapping) and str(m.get("role", "")).lower() == "user":
			return str(m.get("content", "")).strip()
	# fallback: last content
	if messages:
		last = messages[-1]
		if isinstance(last, Mapping):
			return str(last.get("content", "")).strip()
		return str(last).strip()
	return ""


class TutorChatPayload(BaseModel):
	learner_profile: Any = ""
	messages: Any
	use_search: bool = True
	top_k: int = 5
	external_resources: Optional[str] = None

	@field_validator("learner_profile")
	@classmethod
	def coerce_profile(cls, v: Any) -> Any:
		if isinstance(v, BaseModel):
			return v.model_dump()
		if isinstance(v, Mapping):
			return dict(v)
		return v


class AITutorChatbot(BaseAgent):
	name: str = "AITutorChatbot"

	def __init__(self, model: Any, *, search_rag_manager: Optional[SearchRagManager] = None):
		super().__init__(model=model, system_prompt=ai_tutor_chatbot_system_prompt, jsonalize_output=False)
		self.search_rag_manager = search_rag_manager

	def chat(self, payload: TutorChatPayload | Mapping[str, Any] | str):
		if not isinstance(payload, TutorChatPayload):
			payload = TutorChatPayload.model_validate(payload)

		data = payload.model_dump()
		messages = data.get("messages")
		history_text = _stringify_history(messages)
		query = _last_user_query(messages)

		external_context = data.get("external_resources") or ""
		if self.search_rag_manager is not None and query:
			try:
				if data.get("use_search", True):
					docs = self.search_rag_manager.invoke(query)
				else:
					# Vectorstore-only retrieval
					docs = self.search_rag_manager.retrieve(query, k=max(1, int(data.get("top_k", 5))))
				context = format_docs(docs)
				if context:
					external_context = f"{external_context}\n{context}" if external_context else context
			except Exception:
				pass

		input_vars = {
			"learner_profile": data.get("learner_profile", ""),
			"messages": history_text,
			"external_resources": external_context,
		}
		raw_reply = self.invoke(input_vars, task_prompt=ai_tutor_chatbot_task_prompt)
		return raw_reply


def chat_with_tutor_with_llm(
	llm: Any,
	messages: Optional[Sequence[Mapping[str, Any]]] | str = None,
	learner_profile: Any = "",
	*,
	search_rag_manager: Optional[SearchRagManager] = None,
	use_search: bool = True,
	top_k: int = 5,
):
	"""Convenience helper to run an AI tutor chat turn with optional RAG.

	- If a SearchRagManager is provided and use_search=True, performs web search + retrieval.
	- If provided and use_search=False, performs vectorstore-only retrieval.
	- If not provided, replies without external context.
	"""
	agent = AITutorChatbot(llm, search_rag_manager=search_rag_manager)
	payload = {
		"learner_profile": learner_profile,
		"messages": messages,
		"use_search": use_search,
		"top_k": top_k,
	}
	return agent.chat(payload)
