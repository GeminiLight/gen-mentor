from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Dict, TypeAlias

from pydantic import BaseModel, Field
from base import BaseAgent
from ..prompts.skill_requirement_mapper import skill_requirement_mapper_system_prompt, skill_requirement_mapper_task_prompt
from ..schemas import SkillRequirements


JSONDict: TypeAlias = Dict[str, Any]

class Goal2SkillPayload(BaseModel):
	"""Payload for mapping a learning goal to required skills (validated)."""

	learning_goal: str = Field(...)


class SkillRequirementMapper(BaseAgent):
	"""Agent wrapper for mapping a goal to required skills."""

	name: str = "SkillRequirementMapper"

	def __init__(self, model: Any) -> None:
		super().__init__(
			model=model,
			system_prompt=skill_requirement_mapper_system_prompt,
			jsonalize_output=True,
		)

	def map_goal_to_skill(self, input_dict: Mapping[str, Any]) -> JSONDict:
		payload_dict = Goal2SkillPayload(**input_dict).model_dump()
		task_prompt = skill_requirement_mapper_task_prompt
		raw_output = self.invoke(payload_dict, task_prompt=task_prompt)
		validated = SkillRequirements.model_validate(raw_output)
		return validated.model_dump()


def map_goal_to_skills_with_llm(llm: Any, learning_goal: str) -> JSONDict:
	mapper = SkillRequirementMapper(llm)
	return mapper.map_goal_to_skill({"learning_goal": learning_goal})

