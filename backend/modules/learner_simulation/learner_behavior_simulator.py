from __future__ import annotations

import ast
import json
import os
from typing import Any, Dict, Mapping, Union

from base import BaseAgent
from .schemas import parse_learner_behavior_log
from .prompts import (
    learner_interaction_simulator_system_prompt,
    learner_interaction_simulator_task_prompt,
)
from pydantic import BaseModel, Field, field_validator


class LearnerInteractionPayload(BaseModel):
    """Payload for simulating learner interactions for a given session."""

    ground_truth_profile: Union[str, Dict[str, Any], Mapping[str, Any]]
    session_number: int = Field(..., ge=1)

    @field_validator("ground_truth_profile")
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


class LearnerInteractionSimulator(BaseAgent):

    name: str = 'LearnerInteractionSimulator'

    def __init__(self, model: Any):
        super().__init__(
            model=model,
            system_prompt=learner_interaction_simulator_system_prompt,
            jsonalize_output=True,
        )

    def simulate_interactions(self, input_dict: Mapping[str, Any]) -> Dict[str, Any]:
        """
        Simulate learner interactions based on the ground-truth profile and session count.

        Args:
            input_dict (dict): Input dictionary containing the ground-truth profile and session count.
                - previous_ground_truth_profile (dict): The ground-truth learner profile.
                - progressed_ground_truth_profile (dict): The progressed ground-truth learner profile.
                - session_information (dict): Information about the current session.
        """
        payload = LearnerInteractionPayload(**input_dict).model_dump()
        task_prompt = learner_interaction_simulator_task_prompt
        raw_output = self.invoke(payload, task_prompt=task_prompt)
        validated = parse_learner_behavior_log(raw_output)
        return validated.model_dump()


def simulate_learner_interactions_with_llm(
    llm: Any,
    ground_truth_profile: Union[str, Mapping[str, Any]],
    session_count: int = 5,
) -> list[Dict[str, Any]]:
    """Simulate interactions for multiple sessions and persist logs."""

    print("==== Step 2: Simulate Learner Interactions ====")
    learner_behavior_simulator = LearnerInteractionSimulator(llm)
    behavior_logs: list[Dict[str, Any]] = []

    for session in range(1, session_count + 1):
        behavior_log = learner_behavior_simulator.simulate_interactions(
            {
                "ground_truth_profile": ground_truth_profile,
                "session_number": session,
            }
        )
        behavior_logs.append(behavior_log)

    # Save logs to data/output/behavior_logs.json
    out_dir = os.path.join("data", "output")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "behavior_logs.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(behavior_logs, f, ensure_ascii=False, indent=2)
    return behavior_logs
