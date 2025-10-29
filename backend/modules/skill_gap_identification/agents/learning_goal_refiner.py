from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Dict, TypeAlias

from base import BaseAgent
from ..prompts.learning_goal_refiner import learning_goal_refiner_system_prompt, learning_goal_refiner_task_prompt
from ..schemas import RefinedLearningGoal
from pydantic import BaseModel, Field

JSONDict: TypeAlias = Dict[str, Any]


class RefineGoalPayload(BaseModel):
	"""Payload for refining a learning goal (validated)."""

	learning_goal: str = Field(...)
	learner_information: str = Field("")


class LearningGoalRefiner(BaseAgent):
	"""Agent wrapper for refining learner goals."""

	name: str = "LearningGoalRefiner"

	def __init__(self, model: Any) -> None:
		super().__init__(model=model, system_prompt=learning_goal_refiner_system_prompt, jsonalize_output=True)

	def refine_goal(
		self,
		input_dict: Mapping[str, Any],
	) -> JSONDict:
		"""Refine a learner's goal using contextual learner information."""

		payload_dict = RefineGoalPayload(**input_dict).model_dump()
		task_prompt = learning_goal_refiner_task_prompt
		raw_output = self.invoke(payload_dict, task_prompt=task_prompt)
		validated = RefinedLearningGoal.model_validate(raw_output)
		return validated.model_dump()

def refine_learning_goal_with_llm(
	llm: Any,
	learning_goal: str,
	learner_information: str = "",
) -> JSONDict:
	"""Refine a learner's goal using the provided LLM."""

	refiner = LearningGoalRefiner(llm)
	return refiner.refine_goal(
		{
			"learning_goal": learning_goal,
			"learner_information": learner_information,
		}
	)
