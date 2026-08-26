"""Tests for the pydantic response models' repair-first validators.

Skill gaps / requirements: ``is_gap`` auto-correction, 20-word reason
truncation, case-insensitive dedup, 10-item cap, empty-list rejection.
Learning paths: 10-session cap, empty rejection. Learner profiles: progress
clamping into [0, 100].
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from modules.adaptive_learner_modeling.schemas import CognitiveStatus
from modules.personalized_resource_delivery.schemas import LearningPath
from modules.skill_gap_identification.schemas import (
    SkillGap,
    SkillGaps,
    SkillRequirement,
    SkillRequirements,
)


def _requirement(name: str, level: str = "advanced") -> dict:
    return {"name": name, "required_level": level}


def _gap(**overrides) -> dict:
    base = {
        "name": "Python",
        "is_gap": True,
        "required_level": "advanced",
        "current_level": "beginner",
        "reason": "needs structured practice",
        "level_confidence": "high",
    }
    base.update(overrides)
    return base


# --- SkillGap.is_gap auto-correction -------------------------------------------


def test_is_gap_auto_corrected_to_true_when_level_below_required():
    """required=advanced / current=beginner with a wrong is_gap=false flips to true."""
    gap = SkillGap.model_validate(_gap(is_gap=False))
    assert gap.is_gap is True


def test_is_gap_auto_corrected_to_false_when_level_meets_required():
    gap = SkillGap.model_validate(
        _gap(required_level="beginner", current_level="advanced", is_gap=True)
    )
    assert gap.is_gap is False


def test_is_gap_unchanged_when_consistent():
    gap = SkillGap.model_validate(_gap(is_gap=True))
    assert gap.is_gap is True
    equal = SkillGap.model_validate(
        _gap(required_level="intermediate", current_level="intermediate", is_gap=False)
    )
    assert equal.is_gap is False


# --- SkillGap.reason truncation --------------------------------------------------


def test_reason_truncated_to_twenty_words():
    long_reason = " ".join(f"word{i}" for i in range(30))
    gap = SkillGap.model_validate(_gap(reason=long_reason))
    words = gap.reason.split()
    assert len(words) == 20
    assert words[0] == "word0"
    assert words[-1] == "word19"


def test_reason_whitespace_normalized():
    gap = SkillGap.model_validate(_gap(reason="  short    enough  "))
    assert gap.reason == "short enough"


# --- SkillRequirements: dedup, cap, empty -----------------------------------------


def test_skill_requirements_dedup_is_case_insensitive_first_kept():
    requirements = SkillRequirements.model_validate(
        {
            "skill_requirements": [
                _requirement("Python"),
                _requirement("python", "beginner"),
                _requirement(" PYTHON "),
                _requirement("Rust", "beginner"),
            ]
        }
    )
    names = [item.name for item in requirements.skill_requirements]
    assert names == ["Python", "Rust"]  # first occurrence wins, casing preserved


def test_skill_requirements_capped_at_ten():
    items = [_requirement(f"skill {i}") for i in range(12)]
    requirements = SkillRequirements.model_validate({"skill_requirements": items})
    assert len(requirements.skill_requirements) == 10
    assert requirements.skill_requirements[0].name == "skill 0"


def test_skill_requirements_empty_list_raises():
    with pytest.raises(ValidationError, match="At least one skill requirement"):
        SkillRequirements.model_validate({"skill_requirements": []})


# --- SkillGaps: dedup, cap, empty ---------------------------------------------------


def test_skill_gaps_dedup_case_insensitive():
    gaps = SkillGaps.model_validate(
        {"skill_gaps": [_gap(name="Python"), _gap(name="python"), _gap(name="SQL")]}
    )
    assert [item.name for item in gaps.skill_gaps] == ["Python", "SQL"]


def test_skill_gaps_capped_at_ten():
    items = [_gap(name=f"skill {i}") for i in range(15)]
    gaps = SkillGaps.model_validate({"skill_gaps": items})
    assert len(gaps.skill_gaps) == 10


def test_skill_gaps_empty_list_raises():
    with pytest.raises(ValidationError, match="At least one skill gap"):
        SkillGaps.model_validate({"skill_gaps": []})


# --- LearningPath ----------------------------------------------------------------------


def _session(index: int) -> dict:
    return {
        "id": f"Session {index}",
        "title": f"Session {index} title",
        "abstract": "abstract",
        "if_learned": index < 3,
        "associated_skills": ["Python"],
        "desired_outcome_when_completed": [{"name": "Python", "level": "advanced"}],
    }


def test_learning_path_truncated_to_ten_sessions():
    path = LearningPath.model_validate(
        {"learning_path": [_session(i) for i in range(12)]}
    )
    assert len(path.learning_path) == 10
    # The cut falls on the tail; learned sessions (first by contract) survive.
    assert path.learning_path[0].id == "Session 0"


def test_learning_path_empty_raises():
    with pytest.raises(ValidationError, match="at least one session"):
        LearningPath.model_validate({"learning_path": []})


# --- CognitiveStatus.overall_progress clamping -----------------------------------------


def test_overall_progress_clamped_from_above():
    status = CognitiveStatus.model_validate({"overall_progress": 105})
    assert status.overall_progress == 100


def test_overall_progress_clamped_from_below():
    status = CognitiveStatus.model_validate({"overall_progress": -3})
    assert status.overall_progress == 0


def test_overall_progress_numeric_string_and_in_range_values():
    assert CognitiveStatus.model_validate({"overall_progress": "42"}).overall_progress == 42
    assert CognitiveStatus.model_validate({"overall_progress": 0}).overall_progress == 0
    assert CognitiveStatus.model_validate({"overall_progress": 100}).overall_progress == 100
