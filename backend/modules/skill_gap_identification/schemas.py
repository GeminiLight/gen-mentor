from enum import Enum
from typing import List
from pydantic import BaseModel, Field, RootModel, field_validator, model_validator



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
        # LLM output repair, not rejection: an over-long list is truncated and
        # case-insensitive duplicate names keep their first occurrence. An
        # empty list stays an error -- a goal with zero skills is degenerate.
        if not v:
            raise ValueError("At least one skill requirement is needed.")
        deduped: List[SkillRequirement] = []
        seen = set()
        for item in v:
            key = item.name.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
        return deduped[:10]


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
        # Models regularly overshoot "max 20 words"; truncate rather than fail
        # the whole request.
        return " ".join(v.split()[:20])

    @model_validator(mode="after")
    def check_gap_consistency(self) -> "SkillGap":
        # Runs after ALL fields are set (a field_validator on is_gap would only
        # see the fields declared before it). Auto-correct rather than raise:
        # the levels are the ground truth and a wrong is_gap flag would
        # otherwise fail the whole request.
        order = {"unlearned": 0, "beginner": 1, "intermediate": 2, "advanced": 3}
        gap_should_be = order[self.current_level.value] < order[self.required_level.value]
        if self.is_gap != gap_should_be:
            self.is_gap = gap_should_be
        return self


class SkillGaps(BaseModel):
    skill_gaps: List[SkillGap]

    @field_validator("skill_gaps")
    @classmethod
    def limit_length_and_names(cls, v: List[SkillGap]):
        # Same repair-first policy as SkillRequirements: dedup by name, cap at
        # ten; empty stays an error (see the explorer's contract).
        if not v:
            raise ValueError("At least one skill gap is needed.")
        deduped: List[SkillGap] = []
        seen = set()
        for item in v:
            key = item.name.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
        return deduped[:10]


class SkillGapsRoot(RootModel):
    root: List[SkillGap]


class RefinedLearningGoal(BaseModel):
    refined_goal: str

