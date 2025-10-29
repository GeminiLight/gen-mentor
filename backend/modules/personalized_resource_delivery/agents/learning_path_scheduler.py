from typing import Any, Dict, Mapping, Optional, Protocol, Sequence, Union, runtime_checkable
from pydantic import BaseModel, Field, field_validator

from base import BaseAgent
from ..schemas import LearningPath
from modules.personalized_resource_delivery.prompts.learning_path_scheduling import (
    learning_path_scheduler_system_prompt,
    learning_path_scheduler_task_prompt_reflexion,
    learning_path_scheduler_task_prompt_reschedule,
    learning_path_scheduler_task_prompt_session,
)


JSONDict = Dict[str, Any]


class SessionSchedulePayload(BaseModel):
    """Input payload for scheduling sessions (validated)."""

    learner_profile: Union[str, Dict[str, Any], Mapping[str, Any]]
    session_count: int = 0


class LearningPathRefinementPayload(BaseModel):
    """Input payload for reflexion/refinement of a learning path (validated)."""

    learning_path: Sequence[Any]
    feedback: Union[str, Dict[str, Any], Mapping[str, Any]]


class LearningPathReschedulePayload(BaseModel):
    """Input payload for rescheduling an existing learning path (validated)."""

    learner_profile: Union[str, Dict[str, Any], Mapping[str, Any]]
    learning_path: Sequence[Any]
    session_count: Optional[Union[int, str]] = None
    other_feedback: Optional[Union[str, Dict[str, Any], Mapping[str, Any]]] = None


class LearningPathScheduler(BaseAgent):
    """High-level agent orchestrating learning path scheduling tasks."""

    name: str = "LearningPathScheduler"

    def __init__(self, model: Any) -> None:
        super().__init__(
            model=model,
            system_prompt=learning_path_scheduler_system_prompt,
            jsonalize_output=True,
        )

    def schedule_session(self, input_dict: Dict[str, Any]) -> JSONDict:
        """Schedule sessions based on learner profile and desired count."""
        payload_dict = SessionSchedulePayload(**input_dict).model_dump()
        task_prompt = learning_path_scheduler_task_prompt_session
        raw_output = self.invoke(payload_dict, task_prompt=task_prompt)
        validated_output = LearningPath.model_validate(raw_output)
        return validated_output.model_dump()

    def reflexion(self, input_dict: Dict[str, Any]) -> JSONDict:
        """Refine the learning path based on evaluator feedback."""
        payload_dict = LearningPathRefinementPayload(**input_dict).model_dump()
        task_prompt = learning_path_scheduler_task_prompt_reflexion
        raw_output = self.invoke(payload_dict, task_prompt=task_prompt)
        validated = LearningPath.model_validate(raw_output)
        return validated.model_dump()

    def reschedule(self, input_dict: Dict[str, Any]) -> JSONDict:
        """Reschedule the learning path with optional new session_count/feedback."""

        payload_dict = LearningPathReschedulePayload(**input_dict).model_dump()
        task_prompt = learning_path_scheduler_task_prompt_reschedule
        raw_output = self.invoke(payload_dict, task_prompt=task_prompt)
        validated = LearningPath.model_validate(raw_output)
        return validated.model_dump()


def schedule_learning_path_with_llm(
    llm: Any,
    learner_profile: Mapping[str, Any],
    session_count: int = 0,
) -> JSONDict:
    """Convenience helper to create a scheduler and produce a new learning path."""

    learning_path_scheduler = LearningPathScheduler(llm)
    payload_dict = {
        "learner_profile": learner_profile,
        "session_count": session_count,
    }
    return learning_path_scheduler.schedule_session(payload_dict)


def reschedule_learning_path_with_llm(
    llm: Any,
    learning_path: Sequence[Any],
    learner_profile: Mapping[str, Any],
    session_count: Optional[int] = None,
    other_feedback: Optional[Union[str, Mapping[str, Any]]] = None,
    *,
    system_prompt: str = learning_path_scheduler_system_prompt,
    task_prompt: str = learning_path_scheduler_task_prompt_reschedule,
) -> JSONDict:
    """Convenience helper to reschedule an existing learning path via the scheduler."""

    learning_path_scheduler = LearningPathScheduler(llm)
    payload_dict = {
        "learner_profile": learner_profile,
        "learning_path": learning_path,
        "session_count": session_count,
        "other_feedback": other_feedback,
    }
    return learning_path_scheduler.reschedule(payload_dict)


def refine_learning_path_with_llm(
    llm: Any,
    learning_path: Sequence[Any],
    feedback: Mapping[str, Any],
    *,
    system_prompt: str = learning_path_scheduler_system_prompt,
    task_prompt: str = learning_path_scheduler_task_prompt_reflexion,
) -> JSONDict:
    """Convenience helper around :meth:`LearningPathScheduler.reflexion`."""

    learning_path_scheduler = LearningPathScheduler(llm)
    payload_dict = {
        "learning_path": learning_path,
        "feedback": feedback,
    }
    return learning_path_scheduler.reflexion(payload_dict)


__all__ = [
    "LearningPathScheduler",
    "LearningPathRefinementPayload",
    "LearningPathReschedulePayload",
    "SessionSchedulePayload",
    "schedule_learning_path_with_llm",
    "refine_learning_path_with_llm",
    "reschedule_learning_path_with_llm",
]