from __future__ import annotations

from typing import Any, Mapping

from pydantic import BaseModel, Field, field_validator

from base import BaseAgent
from modules.personalized_resource_delivery.prompts.document_quiz_generator import (
    document_quiz_generator_system_prompt,
    document_quiz_generator_task_prompt,
)
from modules.personalized_resource_delivery.schemas import DocumentQuiz


class DocumentQuizPayload(BaseModel):
    learner_profile: Any
    learning_document: Any
    single_choice_count: int = 0
    multiple_choice_count: int = 0
    true_false_count: int = 0
    short_answer_count: int = 0

    @field_validator("learner_profile", "learning_document")
    @classmethod
    def coerce_jsonish(cls, v: Any) -> Any:
        if isinstance(v, BaseModel):
            return v.model_dump()
        if isinstance(v, Mapping):
            return dict(v)
        if isinstance(v, str):
            return v.strip()
        return v


class DocumentQuizGenerator(BaseAgent):
    name: str = "DocumentQuizGenerator"

    def __init__(self, model: Any):
        super().__init__(model=model, system_prompt=document_quiz_generator_system_prompt, jsonalize_output=True)

    def generate(self, payload: DocumentQuizPayload | Mapping[str, Any] | str):
        if not isinstance(payload, DocumentQuizPayload):
            payload = DocumentQuizPayload.model_validate(payload)
        raw_output = self.invoke(payload.model_dump(), task_prompt=document_quiz_generator_task_prompt)
        validated_output = DocumentQuiz.model_validate(raw_output)
        return validated_output.model_dump()


def generate_document_quizzes_with_llm(
    llm,
    learner_profile,
    learning_document,
    single_choice_count: int = 3,
    multiple_choice_count: int = 0,
    true_false_count: int = 0,
    short_answer_count: int = 0,
):
    payload = {
        "learner_profile": learner_profile,
        "learning_document": learning_document,
        "single_choice_count": single_choice_count,
        "multiple_choice_count": multiple_choice_count,
        "true_false_count": true_false_count,
        "short_answer_count": short_answer_count,
    }
    gen = DocumentQuizGenerator(llm)
    return gen.generate(payload)
