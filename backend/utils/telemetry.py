"""Lightweight in-process telemetry for LLM agent calls.

Records latency, token usage, and outcome per agent invocation. No external
services: counters live in memory, are logged at INFO, and are exposed via the
``/stats`` endpoint. Thread-safe by construction (a single lock guards the
registry); volumes here are per-process demo scale.

If richer tracing is ever needed, point LangSmith at the backend by setting
LANGSMITH_TRACING=true (+ API key) — nothing in this module conflicts with it.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class CallRecord:
    agent: str
    latency_s: float
    input_tokens: int = 0
    output_tokens: int = 0
    outcome: str = "ok"  # ok | error | validation_retry | validation_failed
    error: str = ""


@dataclass
class AgentStats:
    calls: int = 0
    errors: int = 0
    validation_retries: int = 0
    validation_failures: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    total_latency_s: float = 0.0
    recent: List[CallRecord] = field(default_factory=list)

    def add(self, record: CallRecord) -> None:
        self.calls += 1
        self.total_latency_s += record.latency_s
        self.input_tokens += record.input_tokens
        self.output_tokens += record.output_tokens
        if record.outcome == "error":
            self.errors += 1
        elif record.outcome == "validation_retry":
            self.validation_retries += 1
        elif record.outcome == "validation_failed":
            self.validation_failures += 1
        self.recent.append(record)
        del self.recent[:-50]  # rolling window


class _Registry:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._agents: Dict[str, AgentStats] = defaultdict(AgentStats)
        self._started = time.time()

    def record(self, rec: CallRecord) -> None:
        with self._lock:
            self._agents[rec.agent].add(rec)
        level = logging.INFO if rec.outcome == "ok" else logging.WARNING
        logger.log(
            level,
            "agent=%s outcome=%s latency=%.2fs tokens(in/out)=%d/%d%s",
            rec.agent, rec.outcome, rec.latency_s, rec.input_tokens, rec.output_tokens,
            f" error={rec.error}" if rec.error else "",
        )

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            agents = {
                name: {
                    "calls": s.calls,
                    "errors": s.errors,
                    "validation_retries": s.validation_retries,
                    "validation_failures": s.validation_failures,
                    "input_tokens": s.input_tokens,
                    "output_tokens": s.output_tokens,
                    "avg_latency_s": round(s.total_latency_s / s.calls, 3) if s.calls else 0.0,
                }
                for name, s in sorted(self._agents.items())
            }
            return {
                "uptime_s": round(time.time() - self._started, 1),
                "agents": agents,
                "totals": {
                    "calls": sum(a["calls"] for a in agents.values()),
                    "input_tokens": sum(a["input_tokens"] for a in agents.values()),
                    "output_tokens": sum(a["output_tokens"] for a in agents.values()),
                },
            }


_registry = _Registry()


def record_call(agent: str, latency_s: float, usage: Optional[Dict[str, int]] = None,
                outcome: str = "ok", error: str = "") -> None:
    """Record one agent invocation (usage = usage_metadata dict from an AIMessage)."""
    usage = usage or {}
    _registry.record(CallRecord(
        agent=agent,
        latency_s=latency_s,
        input_tokens=int(usage.get("input_tokens", 0) or 0),
        output_tokens=int(usage.get("output_tokens", 0) or 0),
        outcome=outcome,
        error=error[:300],
    ))


def extract_usage(raw_output: Any) -> Dict[str, int]:
    """Pull usage_metadata out of a langgraph agent result (best effort)."""
    try:
        messages = raw_output.get("messages") or []
        for msg in reversed(messages):
            meta = getattr(msg, "usage_metadata", None)
            if meta:
                return dict(meta)
    except Exception:
        pass
    return {}


def stats_snapshot() -> Dict[str, Any]:
    return _registry.snapshot()
