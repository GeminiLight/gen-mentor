from __future__ import annotations

from typing import Any, Mapping

from pydantic import BaseModel, Field, field_validator

from base import BaseAgent
from ..prompts.learner_feedback_simulation import (
    learner_feedback_simulator_system_prompt,
    learner_feedback_simulator_task_prompt_path,
    learner_feedback_simulator_task_prompt_content,
)
from ..schemas import LearnerFeedback


class LearningPathFeedbackPayload(BaseModel):
    learner_profile: Any = Field(default_factory=dict)
    learning_path: Any


class LearningContentFeedbackPayload(BaseModel):
    learner_profile: Any = Field(default_factory=dict)
    learning_content: Any

    @field_validator("learner_profile", "learning_content")
    @classmethod
    def coerce_jsonish(cls, v: Any) -> Any:
        if isinstance(v, BaseModel):
            return v.model_dump()
        if isinstance(v, Mapping):
            return dict(v)
        if isinstance(v, str):
            return v.strip()
        return v


class LearnerFeedbackSimulator(BaseAgent):

    name: str = "LearnerFeedbackSimulator"

    def __init__(self, model):
        super().__init__(model=model, jsonalize_output=True)
        self.system_prompt = learner_feedback_simulator_system_prompt

    def feedback_path(self, payload: LearningPathFeedbackPayload | Mapping[str, Any] | str):
        task_prompt = learner_feedback_simulator_task_prompt_path
        if not isinstance(payload, LearningPathFeedbackPayload):
            payload = LearningPathFeedbackPayload.model_validate(payload)
        raw_output = self.invoke(payload.model_dump(), task_prompt=task_prompt)
        validated_output = LearnerFeedback.model_validate(raw_output)
        return validated_output.model_dump()

    def feedback_content(self, payload: LearningContentFeedbackPayload | Mapping[str, Any] | str):
        task_prompt = learner_feedback_simulator_task_prompt_content
        if not isinstance(payload, LearningContentFeedbackPayload):
            payload = LearningContentFeedbackPayload.model_validate(payload)
        raw_output = self.invoke(payload.model_dump(), task_prompt=task_prompt)
        validated_output = LearnerFeedback.model_validate(raw_output)
        return validated_output.model_dump()