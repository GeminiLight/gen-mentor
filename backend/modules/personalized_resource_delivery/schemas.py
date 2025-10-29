from __future__ import annotations

from enum import Enum
from typing import List, Sequence

from pydantic import BaseModel, Field, RootModel, field_validator


class Proficiency(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class DesiredOutcome(BaseModel):
    name: str = Field(..., description="Skill name")
    level: Proficiency = Field(..., description="Desired proficiency when completed")


class SessionItem(BaseModel):
    id: str = Field(..., description="Session identifier, e.g., 'Session 1'")
    title: str
    abstract: str
    if_learned: bool
    associated_skills: List[str] = Field(default_factory=list)
    desired_outcome_when_completed: List[DesiredOutcome] = Field(default_factory=list)

    @field_validator("associated_skills")
    @classmethod
    def ensure_nonempty_strings(cls, v: Sequence[str]) -> List[str]:
        return [s for s in (str(x).strip() for x in v) if s]


class LearningPath(BaseModel):
    learning_path: List[SessionItem]

    @field_validator("learning_path")
    @classmethod
    def limit_sessions(cls, v: List[SessionItem]) -> List[SessionItem]:
        if not (1 <= len(v) <= 10):
            raise ValueError("Learning path must contain between 1 and 10 sessions.")
        return v


class KnowledgeType(str, Enum):
    foundational = "foundational"
    practical = "practical"
    strategic = "strategic"


class KnowledgePoint(BaseModel):
    name: str
    type: KnowledgeType


class KnowledgePoints(BaseModel):
    knowledge_points: List[KnowledgePoint]

class KnowledgeDraft(BaseModel):
    title: str
    content: str


class DocumentStructure(BaseModel):
    title: str
    overview: str
    summary: str


class SingleChoiceQuestion(BaseModel):
    question: str
    options: List[str]
    correct_option: int | str
    explanation: str | None = None


class MultipleChoiceQuestion(BaseModel):
    question: str
    options: List[str]
    correct_options: List[int | str]
    explanation: str | None = None


class TrueFalseQuestion(BaseModel):
    question: str
    correct_answer: bool
    explanation: str | None = None


class ShortAnswerQuestion(BaseModel):
    question: str
    expected_answer: str
    explanation: str | None = None


class DocumentQuiz(BaseModel):
    single_choice_questions: List[SingleChoiceQuestion] = Field(default_factory=list)
    multiple_choice_questions: List[MultipleChoiceQuestion] = Field(default_factory=list)
    true_false_questions: List[TrueFalseQuestion] = Field(default_factory=list)
    short_answer_questions: List[ShortAnswerQuestion] = Field(default_factory=list)


def parse_knowledge_points(data) -> KnowledgePoints:
    return KnowledgePoints.model_validate(data)


def parse_knowledge_draft(data) -> KnowledgeDraft:
    return KnowledgeDraft.model_validate(data)


def parse_document_structure(data) -> DocumentStructure:
    return DocumentStructure.model_validate(data)


def parse_document_quiz(data) -> DocumentQuiz:
    return DocumentQuiz.model_validate(data)



class FeedbackDetail(BaseModel):
    progression: str
    engagement: str
    personalization: str


class LearnerFeedback(BaseModel):
    feedback: FeedbackDetail
    suggestions: FeedbackDetail



class ContentSection(BaseModel):
    title: str
    summary: str


class ContentOutline(BaseModel):
    title: str
    sections: List[ContentSection] = Field(default_factory=list)


class QuizPair(BaseModel):
    question: str
    answer: str


class LearningContent(BaseModel):
    title: str
    overview: str
    content: str
    summary: str
    quizzes: List[QuizPair] = Field(default_factory=list)

