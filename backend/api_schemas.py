"""Request models for the GenMentor HTTP API.

Payload fields that carry structured data are typed as :data:`JsonLike`.  That
accepts a native JSON object/array *and* the legacy ``str(dict)`` form the
Streamlit client used to send, so the endpoints never have to call
``ast.literal_eval`` themselves.
"""

from __future__ import annotations

import ast
import json
from typing import Annotated, Any, List, Optional

from pydantic import BaseModel, BeforeValidator, Field


def _coerce_jsonish(value: Any) -> Any:
    """Parse a stringified container into a real Python object.

    Plain prose (a learning goal, a CV excerpt, a markdown document) is left
    untouched -- only values that look like a JSON/``repr`` container are
    parsed.  JSON is tried first, then :func:`ast.literal_eval` for the legacy
    ``str(dict)`` encoding.  A value that parses as neither is returned as-is so
    the field validator can produce a meaningful error instead of a crash.
    """
    if not isinstance(value, str):
        return value
    text = value.strip()
    if not text or text[0] not in "[{":
        return value
    try:
        return json.loads(text)
    except (TypeError, ValueError):
        pass
    try:
        return ast.literal_eval(text)
    except (SyntaxError, ValueError, MemoryError, RecursionError):
        return value


JsonLike = Annotated[Any, BeforeValidator(_coerce_jsonish)]
"""Structured payload accepting native JSON or a legacy ``str(dict)`` blob."""


class BaseRequest(BaseModel):
    """Fields shared by every endpoint: which model to run the agents on."""

    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    method_name: str = "genmentor"


class ChatWithTutorRequest(BaseRequest):
    messages: JsonLike
    learner_profile: JsonLike = ""

    @property
    def message_list(self) -> List[dict]:
        """The chat history as a list of ``{"role", "content"}`` mappings."""
        if not isinstance(self.messages, list):
            raise ValueError("`messages` must be a JSON array of chat messages.")
        return self.messages


# Backwards-compatible alias for the original (misspelled) class name.
ChatWithAutorRequest = ChatWithTutorRequest


class LearningGoalRefinementRequest(BaseRequest):
    learning_goal: str
    learner_information: JsonLike = ""


class SkillGapIdentificationRequest(BaseRequest):
    learning_goal: str
    learner_information: JsonLike
    skill_requirements: Optional[JsonLike] = None


class LearnerProfileInitializationWithInfoRequest(BaseRequest):
    learning_goal: str
    learner_information: JsonLike
    skill_gaps: JsonLike


class LearnerProfileInitializationRequest(BaseRequest):
    learning_goal: str
    skill_gaps: JsonLike
    cv_path: str
    skill_requirements: Optional[JsonLike] = None


class LearnerProfileUpdateRequest(BaseRequest):
    learner_profile: JsonLike
    learner_interactions: JsonLike
    learner_information: JsonLike = ""
    session_information: JsonLike = ""


class LearningPathSchedulingRequest(BaseRequest):
    learner_profile: JsonLike
    session_count: int


class LearningPathReschedulingRequest(BaseRequest):
    learner_profile: JsonLike
    learning_path: JsonLike
    session_count: int = -1
    other_feedback: JsonLike = ""


class KnowledgePointExplorationRequest(BaseRequest):
    learner_profile: JsonLike
    learning_path: JsonLike
    learning_session: JsonLike


class KnowledgePointDraftingRequest(BaseRequest):
    learner_profile: JsonLike
    learning_path: JsonLike
    learning_session: JsonLike
    knowledge_points: JsonLike
    knowledge_point: JsonLike
    use_search: bool = True


class KnowledgePointsDraftingRequest(BaseRequest):
    learner_profile: JsonLike
    learning_path: JsonLike
    learning_session: JsonLike
    knowledge_points: JsonLike
    use_search: bool = True
    allow_parallel: bool = True


class LearningDocumentIntegrationRequest(BaseRequest):
    learner_profile: JsonLike
    learning_path: JsonLike
    learning_session: JsonLike
    knowledge_points: JsonLike
    knowledge_drafts: JsonLike
    output_markdown: bool = False


class KnowledgeQuizGenerationRequest(BaseRequest):
    learner_profile: JsonLike
    learning_document: JsonLike
    single_choice_count: int = Field(default=3, ge=0, le=20)
    multiple_choice_count: int = Field(default=0, ge=0, le=20)
    true_false_count: int = Field(default=0, ge=0, le=20)
    short_answer_count: int = Field(default=0, ge=0, le=20)


class TailoredContentGenerationRequest(BaseRequest):
    learner_profile: JsonLike
    learning_path: JsonLike
    learning_session: JsonLike
    use_search: bool = True
    allow_parallel: bool = True
    with_quiz: bool = True


__all__ = [
    "JsonLike",
    "BaseRequest",
    "ChatWithTutorRequest",
    "ChatWithAutorRequest",
    "LearningGoalRefinementRequest",
    "SkillGapIdentificationRequest",
    "LearnerProfileInitializationWithInfoRequest",
    "LearnerProfileInitializationRequest",
    "LearnerProfileUpdateRequest",
    "LearningPathSchedulingRequest",
    "LearningPathReschedulingRequest",
    "KnowledgePointExplorationRequest",
    "KnowledgePointDraftingRequest",
    "KnowledgePointsDraftingRequest",
    "LearningDocumentIntegrationRequest",
    "KnowledgeQuizGenerationRequest",
    "TailoredContentGenerationRequest",
]
