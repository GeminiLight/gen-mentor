from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LearnerBehaviorLog(BaseModel):
    """Schema for a single session's learner interaction log."""

    session_number: int = Field(..., ge=1)
    interactions: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = None


def parse_learner_behavior_log(data: Any) -> LearnerBehaviorLog:
    """Validate arbitrary LLM output as a LearnerBehaviorLog."""

    return LearnerBehaviorLog.model_validate(data)


class GroundTruthProfileResult(BaseModel):
    """Schema for ground-truth profile generation/progression output."""

    learner_profile: Dict[str, Any]


def parse_ground_truth_profile_result(data: Any) -> GroundTruthProfileResult:
    """Validate LLM output of ground-truth profile creation/progression."""

    return GroundTruthProfileResult.model_validate(data)
