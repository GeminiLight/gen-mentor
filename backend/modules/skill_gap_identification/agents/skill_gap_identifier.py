from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Dict, Optional, Tuple, TypeAlias
from pydantic import BaseModel, Field
from base import BaseAgent
from ..prompts.skill_gap_identifier import skill_gap_identifier_system_prompt, skill_gap_identifier_task_prompt
from ..schemas import SkillRequirements, SkillGaps
from .skill_requirement_mapper import SkillRequirementMapper

JSONDict: TypeAlias = Dict[str, Any]


class SkillGapPayload(BaseModel):
    """Payload for identifying skill gaps (validated)."""

    learning_goal: str = Field(...)
    learner_information: str = Field(...)
    skill_requirements: Dict[str, Any] = Field(...)


class SkillGapIdentifier(BaseAgent):
    """Agent wrapper for skill requirement discovery and gap identification."""

    name: str = "SkillGapIdentifier"

    def __init__(self, model: Any, ) -> None:
        super().__init__(
            model=model,
            system_prompt=skill_gap_identifier_system_prompt,
            jsonalize_output=True,
        )

    def identify_skill_gap(
        self,
        input_dict: Mapping[str, Any],
    ) -> JSONDict:
        """Identify knowledge gaps using learner information and expected skills."""
        payload_dict = SkillGapPayload(**input_dict).model_dump()
        task_prompt = skill_gap_identifier_task_prompt
        raw_output = self.invoke(payload_dict, task_prompt=task_prompt)
        validated = SkillGaps.model_validate(raw_output)
        return validated.model_dump()

def identify_skill_gap_with_llm(
    llm: Any,
    learning_goal: str,
    learner_information: str,
    skill_requirements: Optional[Dict[str, Any]] = None,
) -> Tuple[JSONDict, JSONDict]:
    """Identify skill gaps and return both the gaps and the skill requirements used."""

    # Compute requirements if not provided
    if not skill_requirements:
        mapper = SkillRequirementMapper(llm)
        effective_requirements = mapper.map_goal_to_skill({"learning_goal": learning_goal})
    else:
        effective_requirements = skill_requirements

    skill_gap_identifier = SkillGapIdentifier(llm)
    skill_gaps = skill_gap_identifier.identify_skill_gap(
        {
            "learning_goal": learning_goal,
            "learner_information": learner_information,
            "skill_requirements": effective_requirements,
        },
    )
    return skill_gaps, effective_requirements

if __name__ == "__main__":
    # python -m modules.skill_gap_identification.agents.skill_gap_identifier
    from base.llm_factory import LLMFactory

    llm = LLMFactory.create(model="deepseek-chat", model_provider="deepseek")

    learning_goal = "Become proficient in data science."
    learner_information = "I have a background in statistics but limited programming experience."

    skill_gaps, skill_requirements = identify_skill_gap_with_llm(
        llm,
        learning_goal,
        learner_information,
    )

    print("Identified Skill Gap:", skill_gaps)
    print("Skill Requirements Used:", skill_requirements)