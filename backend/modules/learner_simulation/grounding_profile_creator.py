from __future__ import annotations

import ast
from typing import Any, Dict, Mapping, Optional, Union

from base import BaseAgent
from .schemas import parse_ground_truth_profile_result
from .prompts import (
    ground_truth_profile_creator_system_prompt,
    ground_truth_profile_creator_task_prompt,
    ground_truth_profile_creator_task_prompt_progress,
)
from pydantic import BaseModel, Field, field_validator


class GroundTruthProfileCreatePayload(BaseModel):
    """Payload for creating a ground-truth learner profile."""

    learning_goal: str = Field(...)
    learner_information: Union[str, Dict[str, Any], Mapping[str, Any]] = Field("")
    skill_requirements: Optional[Union[str, Dict[str, Any], Mapping[str, Any]]] = None

    @field_validator("learner_information", "skill_requirements")
    @classmethod
    def _coerce_mapping(cls, v):
        if v in (None, ""):
            return {} if v == "" else None
        if isinstance(v, str):
            try:
                parsed = ast.literal_eval(v)
                if isinstance(parsed, Mapping):
                    return dict(parsed)
                return {"raw": v}
            except Exception:
                return {"raw": v}
        if isinstance(v, Mapping):
            return dict(v)
        return v


class GroundTruthProfileProgressPayload(BaseModel):
    """Payload for progressing an existing ground-truth profile."""

    ground_truth_profile: Union[str, Dict[str, Any], Mapping[str, Any]]
    session_information: Union[str, Dict[str, Any], Mapping[str, Any]]

    @field_validator("ground_truth_profile", "session_information")
    @classmethod
    def _coerce_mapping(cls, v):
        if isinstance(v, str):
            try:
                parsed = ast.literal_eval(v)
                if isinstance(parsed, Mapping):
                    return dict(parsed)
                return {"raw": v}
            except Exception:
                return {"raw": v}
        if isinstance(v, Mapping):
            return dict(v)
        return v


class GroundTruthProfileCreator(BaseAgent):

    name: str = 'GroundTruthProfileCreator'

    def __init__(self, model: Any):
        super().__init__(
            model=model,
            system_prompt=ground_truth_profile_creator_system_prompt,
            jsonalize_output=True,
        )

    def create_profile(self, input_dict: Mapping[str, Any]) -> Dict[str, Any]:
        payload = GroundTruthProfileCreatePayload(**input_dict).model_dump()
        task_prompt = ground_truth_profile_creator_task_prompt
        raw_output = self.invoke(payload, task_prompt=task_prompt)
        validated = parse_ground_truth_profile_result(raw_output)
        return validated.model_dump()

    def progress_profile(self, input_dict: Mapping[str, Any]) -> Dict[str, Any]:
        """
        Progress the ground-truth learner profile based on the provided session information.

        Args:
            input_dict (dict): Input dictionary containing the ground-truth profile and session information.
                - ground_truth_profile (dict): The ground-truth learner profile.
                - session_information (dict): Information about the current session.
        """
        payload = GroundTruthProfileProgressPayload(**input_dict).model_dump()
        task_prompt = ground_truth_profile_creator_task_prompt_progress
        raw_output = self.invoke(payload, task_prompt=task_prompt)
        validated = parse_ground_truth_profile_result(raw_output)
        return validated.model_dump()

def create_ground_truth_profile_with_llm(
    llm: Any,
    learning_goal: str,
    learner_information: Union[str, Mapping[str, Any]] = "",
    skill_requirements: Optional[Union[str, Mapping[str, Any]]] = None,
) -> Dict[str, Any]:
    creator = GroundTruthProfileCreator(llm)
    return creator.create_profile(
        {
            "learning_goal": learning_goal,
            "learner_information": learner_information,
            "skill_requirements": skill_requirements,
        }
    )
