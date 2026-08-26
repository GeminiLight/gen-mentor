from __future__ import annotations

import logging
import time
from typing import Any, Callable, Dict, Optional, Sequence

from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from pydantic import ValidationError

from utils.llm_output import preprocess_response
from utils.telemetry import extract_usage, record_call
from langgraph.typing import InputT, OutputT, StateT
from langchain.agents.middleware.types import (
    AgentMiddleware,
    AgentState,
    JumpTo,
    ModelRequest,
    ModelResponse,
    OmitFromSchema,
    _InputAgentState,
    _OutputAgentState,
)

logger = logging.getLogger(__name__)

# Provider exceptions worth retrying, matched by class name so this stays
# provider-agnostic (no import coupling to openai/anthropic/...).
TRANSIENT_ERROR_NAMES = {
    "RateLimitError", "APITimeoutError", "APIConnectionError",
    "InternalServerError", "APIStatusError", "ServiceUnavailableError",
    "ConnectionError", "ReadTimeout", "RemoteProtocolError",
}

TRANSIENT_ATTEMPTS = 3          # initial call + 2 retries
TRANSIENT_BACKOFF_S = 1.0       # 1s, 2s
VALIDATION_REPAIR_ATTEMPTS = 1  # one corrective re-ask on schema violations


def _is_transient(exc: BaseException) -> bool:
    if isinstance(exc, KeyboardInterrupt):
        return False
    seen, cur = set(), exc
    while cur is not None and type(cur).__name__ not in seen:
        seen.add(type(cur).__name__)
        if type(cur).__name__ in TRANSIENT_ERROR_NAMES:
            return True
        cur = cur.__cause__ or cur.__context__
    return False


valid_agent_arg_list = [
    "middleware",
    "response_format",
    "state_schema",
    "context_schema",
    "checkpointer",
    "store",
    "interrupt_before",
    "interrupt_after",
    "debug",
    "name",
    "cache"
]


class BaseAgent:

    def __init__(
            self,
            model: BaseChatModel,
            system_prompt: Optional[str] = None,
            tools: Optional[list[Any]] = None,
            **kwargs
        ) -> None:
        """Initialize a base agent with JSON output and validation."""
        self._model = model
        self._system_prompt = system_prompt
        self._tools = tools
        self._agent_kwargs = {k: v for k, v in kwargs.items() if k in valid_agent_arg_list}
        self._agent = self._build_agent()
        self.exclude_think = kwargs.get("exclude_think", True)
        self.jsonalize_output = kwargs.get("jsonalize_output", True)
        self._name = type(self).__name__

    def _build_agent(self):
        return create_agent(
            model=self._model,
            tools=self._tools,
            system_prompt=self._system_prompt,
            **self._agent_kwargs,
        )

    def set_prompts(self, system_prompt: Optional[str] = None, task_prompt: Optional[str] = None) -> None:
        """Set or update system/task prompts and rebuild the internal agent if needed."""
        if system_prompt is not None:
            self._system_prompt = system_prompt
        if task_prompt is not None:
            self._task_prompt = task_prompt
        self._agent = self._build_agent()

    def _build_prompt(self, variables: Dict[str, Any], task_prompt: Optional[str] = None) -> _InputAgentState:
        """Build chat messages for model call."""
        assert task_prompt is not None, "Either self._task_prompt or task_prompt must be provided."
        task_prompt = task_prompt
        formatted_task = task_prompt.format(**variables)  # type: ignore[union-attr]
        prompt = {
            "messages": [
                {"role": "user", "content": formatted_task}
            ]
        }
        return prompt

    def _invoke_with_retry(self, input_prompt: dict) -> Any:
        """Run the underlying graph, retrying transient provider errors with backoff."""
        last_exc: Optional[BaseException] = None
        for attempt in range(TRANSIENT_ATTEMPTS):
            try:
                return self._agent.invoke(input_prompt)
            except Exception as exc:
                if not _is_transient(exc) or attempt == TRANSIENT_ATTEMPTS - 1:
                    raise
                last_exc = exc
                wait = TRANSIENT_BACKOFF_S * (2 ** attempt)
                logger.warning(
                    "agent=%s transient error (%s), retry %d/%d in %.0fs",
                    self._name, type(exc).__name__, attempt + 1, TRANSIENT_ATTEMPTS - 1, wait,
                )
                time.sleep(wait)
        raise last_exc  # unreachable, keeps type-checkers content

    def invoke(self, input_dict: dict, task_prompt: Optional[str] = None) -> Any:
        """Invoke the agent with the given input text."""
        input_prompt = self._build_prompt(input_dict, task_prompt=task_prompt)
        started = time.time()
        try:
            raw_output = self._invoke_with_retry(input_prompt)
        except Exception as exc:
            record_call(self._name, time.time() - started, outcome="error", error=str(exc))
            raise
        record_call(self._name, time.time() - started, usage=extract_usage(raw_output))
        output = preprocess_response(
            raw_output, only_text=True, exclude_think=self.exclude_think, json_output=self.jsonalize_output
        )
        return output

    def invoke_validated(self, input_dict: dict, task_prompt: Optional[str] = None,
                         validator: Optional[Callable[[Any], Any]] = None) -> Any:
        """Invoke, then validate with `validator`; on schema violations re-ask once
        with the validation error appended so the model can repair its output.

        Returns the validator's parsed result on success; re-raises the last
        ValidationError otherwise.
        """
        if validator is None:
            return self.invoke(input_dict, task_prompt=task_prompt)
        prompt = self._build_prompt(input_dict, task_prompt=task_prompt)
        outcome = "ok"
        for attempt in range(1 + VALIDATION_REPAIR_ATTEMPTS):
            started = time.time()
            try:
                raw_output = self._invoke_with_retry(prompt)
                usage = extract_usage(raw_output)
                output = preprocess_response(
                    raw_output, only_text=True, exclude_think=self.exclude_think,
                    json_output=self.jsonalize_output,
                )
                return validator(output)
            except ValidationError as exc:
                record_call(self._name, time.time() - started, usage=usage if attempt else {},
                            outcome="validation_retry" if attempt == 0 else "validation_failed",
                            error=str(exc))
                if attempt == VALIDATION_REPAIR_ATTEMPTS:
                    raise
                outcome = "validation_retry"
                # Corrective turn: show the model exactly what failed.
                prompt = {
                    "messages": prompt["messages"] + [
                        {"role": "assistant", "content": str(output)},
                        {"role": "user", "content": (
                            "Your previous answer violated the output contract:\n"
                            f"{exc}\n\nReturn the corrected JSON only, conforming exactly "
                            "to the specified format."
                        )},
                    ]
                }
        raise RuntimeError("unreachable")
