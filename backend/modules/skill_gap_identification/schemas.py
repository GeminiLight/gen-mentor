from enum import Enum
from typing import List
from pydantic import BaseModel, Field, RootModel, field_validator



class LevelRequired(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class LevelCurrent(str, Enum):
    unlearned = "unlearned"
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class Confidence(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"



class SkillRequirement(BaseModel):
    name: str = Field(..., description="Actionable, concise skill name.")
    required_level: LevelRequired


class SkillRequirements(BaseModel):
    skill_requirements: List[SkillRequirement]

    @field_validator("skill_requirements")
    @classmethod
    def validate_length_and_uniqueness(cls, v: List[SkillRequirement]):
        if not (1 <= len(v) <= 10):
            raise ValueError("Number of skill requirements must be within 1 to 10.")
        seen = set()
        for item in v:
            key = item.name.strip().lower()
            if key in seen:
                raise ValueError(f'Duplicate skill name detected: "{item.name}".')
            seen.add(key)
        return v


class SkillGap(BaseModel):
    name: str
    is_gap: bool
    required_level: LevelRequired
    current_level: LevelCurrent
    reason: str = Field(..., description="≤20 words concise rationale for current level.")
    level_confidence: Confidence

    @field_validator("reason")
    @classmethod
    def limit_reason_words(cls, v: str) -> str:
        words = v.split()
        if len(words) > 20:
            raise ValueError("Reason must be 20 words or fewer.")
        return v

    @field_validator("is_gap")
    @classmethod
    def check_gap_consistency(cls, is_gap_value, info):
        data = info.data
        required = data.get("required_level")
        current = data.get("current_level")
        if required is None or current is None:
            return is_gap_value
        order = {"unlearned": 0, "beginner": 1, "intermediate": 2, "advanced": 3}
        gap_should_be = order[current.value] < order[required.value]
        if is_gap_value != gap_should_be:
            raise ValueError(
                f'is_gap inconsistency: required="{required.value}", current="{current.value}" implies is_gap={gap_should_be}.'
            )
        return is_gap_value


class SkillGaps(BaseModel):
    skill_gaps: List[SkillGap]

    @field_validator("skill_gaps")
    @classmethod
    def limit_length_and_names(cls, v: List[SkillGap]):
        if not (1 <= len(v) <= 10):
            raise ValueError("Number of skill gaps must be within 1 to 10.")
        seen = set()
        for item in v:
            key = item.name.strip().lower()
            if key in seen:
                raise ValueError(f'Duplicate skill name detected: "{item.name}".')
            seen.add(key)
        return v


class SkillGapsRoot(RootModel):
    root: List[SkillGap]


class RefinedLearningGoal(BaseModel):
    refined_goal: str

