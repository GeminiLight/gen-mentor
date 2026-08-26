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
	# When set, retrieval also draws on this goal's pinned knowledge base.
	goal_id: Optional[str] = None

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

	def _gather_context(self, data: dict, query: str) -> str:
		"""Collect external context: the goal's knowledge base first (durable,
		what the learner has already read), then fresh search results."""
		external_context = data.get("external_resources") or ""
		if self.search_rag_manager is None or not query:
			return external_context
		docs: List[Any] = []
		try:
			goal_id = data.get("goal_id")
			if goal_id:
				docs.extend(self.search_rag_manager.retrieve_kb(goal_id, query, k=3))
			if data.get("use_search", True):
				docs.extend(self.search_rag_manager.invoke(query))
			elif not goal_id:
				# Vectorstore-only retrieval (legacy behaviour when no KB is in play)
				docs.extend(self.search_rag_manager.retrieve(query, k=max(1, int(data.get("top_k", 5)))))
		except Exception:
			pass
		context = format_docs(docs)
		if context:
			external_context = f"{external_context}\n{context}" if external_context else context
		return external_context

	def _prepare(self, payload: TutorChatPayload | Mapping[str, Any] | str):
		if not isinstance(payload, TutorChatPayload):
			payload = TutorChatPayload.model_validate(payload)
		data = payload.model_dump()
		messages = data.get("messages")
		history_text = _stringify_history(messages)
		query = _last_user_query(messages)
		external_context = self._gather_context(data, query)
		input_vars = {
			"learner_profile": data.get("learner_profile", ""),
			"messages": history_text,
			"external_resources": external_context,
		}
		return self._build_prompt(input_vars, task_prompt=ai_tutor_chatbot_task_prompt)

	def chat(self, payload: TutorChatPayload | Mapping[str, Any] | str):
		prompt = self._prepare(payload)
		return self._chat_from_prompt(prompt)

	def _chat_from_prompt(self, prompt: dict) -> str:
		import time as _time
		started = _time.time()
		try:
			raw_output = self._invoke_with_retry(prompt)
		except Exception as exc:
			from utils.telemetry import record_call
			record_call(self.__class__.__name__, _time.time() - started, outcome="error", error=str(exc))
			raise
		from utils.telemetry import record_call, extract_usage
		record_call("AITutorChatbot", _time.time() - started, usage=extract_usage(raw_output))
		from utils.llm_output import preprocess_response
		return preprocess_response(raw_output, only_text=True, exclude_think=False, json_output=False)

	def chat_stream(self, payload: TutorChatPayload | Mapping[str, Any] | str):
		"""Yield the tutor's reply token-by-token.

		Reasoning models may open with a <think> block; those tokens are held
		back and never yielded — the stream starts at the visible answer.
		"""
		prompt = self._prepare(payload)
		full = []
		in_think = False
		think_seen = False
		pending = ""
		for chunk in self._agent.stream(prompt, stream_mode="messages"):
			msg = chunk[0] if isinstance(chunk, tuple) else chunk
			delta = getattr(msg, "content", "")
			if not delta or not isinstance(delta, str):
				continue
			full.append(delta)
			pending += delta
			# Suppress <think> reasoning if the model emits it.
			if not think_seen and pending.lstrip().startswith("<think"):
				in_think = True
				think_seen = True
				pending = ""
				continue
			if in_think:
				if "</think>" in delta:
					in_think = False
					pending = delta.split("</think>", 1)[1]
				else:
					pending = ""
			if pending:
				out, pending = pending, ""
				yield out
		if pending:
			yield pending
		from utils.telemetry import record_call
		record_call("AITutorChatbot", 0.0, outcome="ok")  # latency/tokens approximated by non-stream path


def chat_with_tutor_with_llm(
	llm: Any,
	messages: Optional[Sequence[Mapping[str, Any]]] | str = None,
	learner_profile: Any = "",
	*,
	search_rag_manager: Optional[SearchRagManager] = None,
	use_search: bool = True,
	top_k: int = 5,
	goal_id: Optional[str] = None,
):
	"""Convenience helper to run an AI tutor chat turn with optional RAG.

	- If a SearchRagManager is provided and use_search=True, performs web search + retrieval.
	- If provided and use_search=False, performs vectorstore-only retrieval.
	- goal_id additionally pulls the goal's pinned knowledge base into context.
	- If not provided, replies without external context.
	"""
	agent = AITutorChatbot(llm, search_rag_manager=search_rag_manager)
	payload = {
		"learner_profile": learner_profile,
		"messages": messages,
		"use_search": use_search,
		"top_k": top_k,
		"goal_id": goal_id,
	}
	return agent.chat(payload)


def chat_with_tutor_stream_with_llm(
	llm: Any,
	messages,
	learner_profile: Any = "",
	*,
	search_rag_manager: Optional[SearchRagManager] = None,
	use_search: bool = True,
	top_k: int = 5,
	goal_id: Optional[str] = None,
):
	"""Streaming variant of chat_with_tutor_with_llm (yields text deltas)."""
	agent = AITutorChatbot(llm, search_rag_manager=search_rag_manager)
	payload = {
		"learner_profile": learner_profile,
		"messages": messages,
		"use_search": use_search,
		"top_k": top_k,
		"goal_id": goal_id,
	}
	return agent.chat_stream(payload)
