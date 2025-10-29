from __future__ import annotations

from enum import Enum
from typing import List

from pydantic import BaseModel, Field, RootModel, field_validator


class RequiredLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class CurrentLevel(str, Enum):
    unlearned = "unlearned"
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class MasteredSkill(BaseModel):
    name: str
    proficiency_level: RequiredLevel


class InProgressSkill(BaseModel):
    name: str
    required_proficiency_level: RequiredLevel
    current_proficiency_level: CurrentLevel


class CognitiveStatus(BaseModel):
    overall_progress: int = Field(..., ge=0, le=100)
    mastered_skills: List[MasteredSkill] = Field(default_factory=list)
    in_progress_skills: List[InProgressSkill] = Field(default_factory=list)


class LearningPreferences(BaseModel):
    content_style: str
    activity_type: str
    additional_notes: str | None = None


class BehavioralPatterns(BaseModel):
    system_usage_frequency: str
    session_duration_engagement: str
    motivational_triggers: str | None = None
    additional_notes: str | None = None


class LearnerProfile(BaseModel):
    learner_information: str
    learning_goal: str
    cognitive_status: CognitiveStatus
    learning_preferences: LearningPreferences
    behavioral_patterns: BehavioralPatterns

    @field_validator("learning_goal")
    @classmethod
    def ensure_nonempty_goal(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("learning_goal must be non-empty")
        return v
