from __future__ import annotations

import logging
from typing import Any, Mapping

from pydantic import BaseModel, field_validator

from base import BaseAgent
from ..prompts.learning_document_integrator import integrated_document_generator_system_prompt, integrated_document_generator_task_prompt
from ..schemas import DocumentStructure


logger = logging.getLogger(__name__)


class IntegratedDocPayload(BaseModel):
    learner_profile: Any
    learning_path: Any
    learning_session: Any
    knowledge_points: Any
    knowledge_drafts: Any

    @field_validator("learner_profile", "learning_path", "learning_session", "knowledge_points", "knowledge_drafts")
    @classmethod
    def coerce_jsonish(cls, v: Any) -> Any:
        if isinstance(v, BaseModel):
            return v.model_dump()
        if isinstance(v, Mapping):
            return dict(v)
        if isinstance(v, str):
            return v.strip()
        return v

class LearningDocumentIntegrator(BaseAgent):
    name: str = "LearningDocumentIntegrator"

    def __init__(self, model: Any):
        super().__init__(model=model, system_prompt=integrated_document_generator_system_prompt, jsonalize_output=True)

    def integrate(self, payload: IntegratedDocPayload | Mapping[str, Any] | str):
        if not isinstance(payload, IntegratedDocPayload):
            payload = IntegratedDocPayload.model_validate(payload)
        raw_output = self.invoke(payload.model_dump(), task_prompt=integrated_document_generator_task_prompt)
        validated_output = DocumentStructure.model_validate(raw_output)
        return validated_output.model_dump()


def integrate_learning_document_with_llm(llm, learner_profile, learning_path, learning_session, knowledge_points, knowledge_drafts, output_markdown=True):
    logger.info(f'Integrating learning document with {len(knowledge_points)} knowledge points and {len(knowledge_drafts)} drafts...')
    input_dict = {
        'learner_profile': learner_profile,
        'learning_path': learning_path,
        'learning_session': learning_session,
        'knowledge_points': knowledge_points,
        'knowledge_drafts': knowledge_drafts
    }
    learning_document_integrator = LearningDocumentIntegrator(llm)
    document_structure = learning_document_integrator.integrate(input_dict)
    if not output_markdown:
        return document_structure
    logger.info('Preparing markdown document...')
    return prepare_markdown_document(document_structure, knowledge_points, knowledge_drafts)


def prepare_markdown_document(document_structure, knowledge_points, knowledge_drafts):
    """Render a markdown learning document from the integrated structure and drafts.

    Expects document_structure with keys: title, overview, summary.
    knowledge_points: list with items containing 'type' in {'foundational','practical','strategic'}.
    knowledge_drafts: list aligned with knowledge_points, each with 'title' and 'content'.
    """
    import ast as _ast
    if isinstance(knowledge_points, str):
        try:
            knowledge_points = _ast.literal_eval(knowledge_points)
        except Exception:
            pass
    if isinstance(knowledge_drafts, str):
        try:
            knowledge_drafts = _ast.literal_eval(knowledge_drafts)
        except Exception:
            pass
    if isinstance(document_structure, str):
        try:
            document_structure = _ast.literal_eval(document_structure)
        except Exception:
            pass

    if not isinstance(document_structure, dict):
        document_structure = {}
    if not isinstance(knowledge_points, list):
        knowledge_points = []
    if not isinstance(knowledge_drafts, list):
        knowledge_drafts = []

    part_titles = {
        'foundational': "## Foundational Concepts",
        'practical': "## Practical Applications",
        'strategic': "## Strategic Insights",
    }

    title = document_structure.get('title', '') if isinstance(document_structure, dict) else ''
    md = f"# {title}"
    md += f"\n\n{document_structure.get('overview','') if isinstance(document_structure, dict) else ''}"
    for k_type, header in part_titles.items():
        md += f"\n\n{header}\n"
        for idx, kp in enumerate(knowledge_points or []):
            if not isinstance(kp, dict) or kp.get('type') != k_type:
                continue
            kd = (knowledge_drafts or [])[idx]
            if isinstance(kd, dict):
                md += f"\n\n### {kd.get('title','')}\n\n{kd.get('content','')}\n"
    md += f"\n\n## Summary\n\n{document_structure.get('summary','') if isinstance(document_structure, dict) else ''}"
    return md