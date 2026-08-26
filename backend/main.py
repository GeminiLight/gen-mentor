"""HTTP API for the GenMentor tutoring system.

Every endpoint is a thin adapter: resolve the LLM for the request, hand the
already-parsed payload to the corresponding agent module, return its result.
Payload deserialisation lives in :mod:`api_schemas` (see ``JsonLike``), so no
endpoint parses strings itself.
"""

from __future__ import annotations

import logging
import os
import threading
from pathlib import Path
from typing import Any, Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from api_schemas import *  # noqa: F403  (request models)
from base.llm_factory import LLMFactory
from base.search_rag import SearchRagManager
from config import load_config
from modules.ai_chatbot_tutor import chat_with_tutor_stream_with_llm
from utils.telemetry import stats_snapshot
from modules.adaptive_learner_modeling import *  # noqa: F403
from modules.ai_chatbot_tutor import chat_with_tutor_with_llm
from modules.personalized_resource_delivery import *  # noqa: F403
from modules.skill_gap_identification import *  # noqa: F403
from utils.preprocess import extract_text_from_pdf

app_config = load_config(config_name="main")

logging.basicConfig(level=str(app_config.get("log_level", "INFO")).upper())
logger = logging.getLogger(__name__)

# Directory for uploaded CVs. Overridable so a deployment can point it at a
# volume; defaults to a repo-relative path so the app runs on a fresh checkout.
UPLOAD_LOCATION = Path(
    os.getenv("GENMENTOR_UPLOAD_DIR", Path(__file__).resolve().parent / "data" / "uploads")
).resolve()

app = FastAPI(title="GenMentor API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_search_rag_manager: Optional[SearchRagManager] = None
_search_rag_lock = threading.Lock()
_search_rag_failed = False


def get_search_rag_manager() -> Optional[SearchRagManager]:
    """Return the process-wide RAG manager, building it on first use.

    Constructing it downloads/loads a sentence-transformer model and opens the
    Chroma store, so it is built once and shared -- passing it into the agents
    is what keeps them from rebuilding one per request. If construction fails
    (no network on first run, missing model cache) the API stays up and the
    agents fall back to answering without retrieved context.
    """
    global _search_rag_manager, _search_rag_failed
    if _search_rag_manager is not None or _search_rag_failed:
        return _search_rag_manager
    with _search_rag_lock:
        if _search_rag_manager is None and not _search_rag_failed:
            try:
                _search_rag_manager = SearchRagManager.from_config(app_config)
            except Exception:
                _search_rag_failed = True
                logger.exception("Search/RAG unavailable; continuing without retrieval.")
    return _search_rag_manager


def get_llm(request: Optional[BaseRequest] = None, **kwargs: Any):  # noqa: F405
    """Build the chat model for a request, falling back to the configured default."""
    llm_config = app_config.get("llm", {})
    provider = getattr(request, "model_provider", None) or llm_config.get("provider", "deepseek")
    model_name = getattr(request, "model_name", None) or llm_config.get("model_name", "deepseek-chat")
    base_url = llm_config.get("base_url")
    return LLMFactory.create(
        model=model_name, model_provider=provider, base_url=base_url, **kwargs
    )


def _fail(exc: Exception, what: str) -> HTTPException:
    """Log the traceback server-side and return a 500 carrying the reason."""
    logger.exception("%s failed", what)
    return HTTPException(status_code=500, detail=f"{what} failed: {exc}")


def _store_upload(upload: UploadFile, content: bytes) -> Path:
    """Persist an upload under UPLOAD_LOCATION, rejecting path traversal."""
    filename = Path(upload.filename or "").name
    if not filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")
    UPLOAD_LOCATION.mkdir(parents=True, exist_ok=True)
    destination = (UPLOAD_LOCATION / filename).resolve()
    if UPLOAD_LOCATION not in destination.parents:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    destination.write_bytes(content)
    return destination


def _extract_cv_text(path: Path) -> str:
    """Extract text from a stored CV, reporting an unreadable file as a 400."""
    try:
        return extract_text_from_pdf(str(path))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read PDF {path.name}: {exc}")


# Warm the RAG stack (embedding model + vector stores) in the background at
# startup: without this, the first retrieval-using request pays the whole
# model load itself. The double-checked lock inside get_search_rag_manager
# makes concurrent first requests safe.
threading.Thread(target=get_search_rag_manager, name="rag-warmup", daemon=True).start()


@app.get("/")
async def root():
    return {"service": "GenMentor", "status": "ok"}


@app.get("/list-llm-models")
async def list_llm_models():
    llm_config = app_config.get("llm", {})
    return {
        "models": [
            {
                "model_name": llm_config.get("model_name", "deepseek-chat"),
                "model_provider": llm_config.get("provider", "deepseek"),
            }
        ]
    }


@app.get("/stats")
async def stats():
    """In-process telemetry: per-agent call counts, token usage, latencies."""
    return stats_snapshot()


@app.post("/chat-with-tutor")
async def chat_with_tutor(request: ChatWithTutorRequest):  # noqa: F405
    try:
        messages = request.message_list
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    try:
        response = chat_with_tutor_with_llm(
            get_llm(request),
            messages,
            request.learner_profile,
            search_rag_manager=get_search_rag_manager(),
            use_search=True,
            goal_id=request.goal_id,
        )
        return {"response": response}
    except Exception as exc:
        raise _fail(exc, "chat-with-tutor")


@app.post("/chat-with-tutor/stream")
def chat_with_tutor_stream(request: ChatWithTutorRequest):  # noqa: F405
    """Streaming variant of /chat-with-tutor: yields reply text as it is generated."""
    try:
        messages = request.message_list
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    def generate():
        try:
            # streaming=True makes the model emit token callbacks, which is what
            # langgraph's "messages" stream mode forwards delta-by-delta.
            for delta in chat_with_tutor_stream_with_llm(
                get_llm(request, streaming=True),
                messages,
                request.learner_profile,
                search_rag_manager=get_search_rag_manager(),
                use_search=True,
                goal_id=request.goal_id,
            ):
                if delta:
                    yield delta
        except Exception as exc:
            logger.exception("chat-with-tutor/stream failed")
            yield f"\n[stream error] {exc}"

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")


@app.post("/refine-learning-goal")
async def refine_learning_goal(request: LearningGoalRefinementRequest):  # noqa: F405
    try:
        return refine_learning_goal_with_llm(  # noqa: F405
            get_llm(request), request.learning_goal, request.learner_information
        )
    except Exception as exc:
        raise _fail(exc, "refine-learning-goal")


@app.post("/identify-skill-gap-with-info")
async def identify_skill_gap_with_info(request: SkillGapIdentificationRequest):  # noqa: F405
    skill_requirements = request.skill_requirements
    if not isinstance(skill_requirements, (dict, list)):
        skill_requirements = None
    try:
        skill_gaps, skill_requirements = identify_skill_gap_with_llm(  # noqa: F405
            get_llm(request),
            request.learning_goal,
            request.learner_information,
            skill_requirements,
        )
        return {**skill_gaps, **skill_requirements}
    except Exception as exc:
        raise _fail(exc, "identify-skill-gap-with-info")


@app.post("/identify-skill-gap")
async def identify_skill_gap(
    goal: str = Form(...),
    cv: UploadFile = File(...),
    model_provider: Optional[str] = Form(None),
    model_name: Optional[str] = Form(None),
):
    """Identify skill gaps from an uploaded CV rather than a pasted profile."""
    content = await cv.read()
    file_location = _store_upload(cv, content)
    cv_text = _extract_cv_text(file_location)
    try:
        skill_gaps, skill_requirements = identify_skill_gap_with_llm(  # noqa: F405
            get_llm(BaseRequest(model_provider=model_provider, model_name=model_name)),  # noqa: F405
            goal,
            cv_text,
        )
        return {**skill_gaps, **skill_requirements}
    except Exception as exc:
        raise _fail(exc, "identify-skill-gap")


@app.post("/create-learner-profile-with-info")
async def create_learner_profile_with_info(
    request: LearnerProfileInitializationWithInfoRequest,  # noqa: F405
):
    try:
        learner_profile = initialize_learner_profile_with_llm(  # noqa: F405
            get_llm(request),
            request.learning_goal,
            request.learner_information,
            request.skill_gaps,
        )
        return {"learner_profile": learner_profile}
    except Exception as exc:
        raise _fail(exc, "create-learner-profile-with-info")


@app.post("/create-learner-profile")
async def create_learner_profile(request: LearnerProfileInitializationRequest):  # noqa: F405
    """Build a learner profile from a CV previously uploaded to UPLOAD_LOCATION."""
    cv_name = Path(request.cv_path).name
    file_location = (UPLOAD_LOCATION / cv_name).resolve()
    if UPLOAD_LOCATION not in file_location.parents or not file_location.is_file():
        raise HTTPException(status_code=404, detail=f"CV not found: {cv_name}")
    try:
        learner_information = _extract_cv_text(file_location)
        learner_profile = initialize_learner_profile_with_llm(  # noqa: F405
            get_llm(request), request.learning_goal, learner_information, request.skill_gaps
        )
        return {"learner_profile": learner_profile}
    except Exception as exc:
        raise _fail(exc, "create-learner-profile")


@app.post("/update-learner-profile")
async def update_learner_profile(request: LearnerProfileUpdateRequest):  # noqa: F405
    try:
        learner_profile = update_learner_profile_with_llm(  # noqa: F405
            get_llm(request),
            request.learner_profile,
            request.learner_interactions,
            request.learner_information,
            request.session_information,
        )
        return {"learner_profile": learner_profile}
    except Exception as exc:
        raise _fail(exc, "update-learner-profile")


@app.post("/schedule-learning-path")
async def schedule_learning_path(request: LearningPathSchedulingRequest):  # noqa: F405
    try:
        return schedule_learning_path_with_llm(  # noqa: F405
            get_llm(request), request.learner_profile, request.session_count
        )
    except Exception as exc:
        raise _fail(exc, "schedule-learning-path")


@app.post("/reschedule-learning-path")
async def reschedule_learning_path(request: LearningPathReschedulingRequest):  # noqa: F405
    try:
        return reschedule_learning_path_with_llm(  # noqa: F405
            get_llm(request),
            request.learning_path,
            request.learner_profile,
            request.session_count,
            request.other_feedback,
        )
    except Exception as exc:
        raise _fail(exc, "reschedule-learning-path")


@app.post("/explore-knowledge-points")
async def explore_knowledge_points(request: KnowledgePointExplorationRequest):  # noqa: F405
    try:
        return explore_knowledge_points_with_llm(  # noqa: F405
            get_llm(request),
            request.learner_profile,
            request.learning_path,
            request.learning_session,
        )
    except Exception as exc:
        raise _fail(exc, "explore-knowledge-points")


@app.post("/draft-knowledge-point")
async def draft_knowledge_point(request: KnowledgePointDraftingRequest):  # noqa: F405
    try:
        knowledge_draft = draft_knowledge_point_with_llm(  # noqa: F405
            get_llm(request),
            request.learner_profile,
            request.learning_path,
            request.learning_session,
            request.knowledge_points,
            request.knowledge_point,
            request.use_search,
            search_rag_manager=get_search_rag_manager(),
            goal_id=request.goal_id,
        )
        return {"knowledge_draft": knowledge_draft}
    except Exception as exc:
        raise _fail(exc, "draft-knowledge-point")


@app.post("/draft-knowledge-points")
async def draft_knowledge_points(request: KnowledgePointsDraftingRequest):  # noqa: F405
    # A prose string here would otherwise be iterated character by character.
    if not isinstance(request.knowledge_points, (list, dict)):
        raise HTTPException(status_code=400, detail="knowledge_points must be a JSON array.")
    try:
        knowledge_drafts = draft_knowledge_points_with_llm(  # noqa: F405
            get_llm(request),
            request.learner_profile,
            request.learning_path,
            request.learning_session,
            request.knowledge_points,
            allow_parallel=request.allow_parallel,
            use_search=request.use_search,
            max_workers=int(app_config.get("rag", {}).get("max_workers", 3)),
            search_rag_manager=get_search_rag_manager(),
            goal_id=request.goal_id,
        )
        return {"knowledge_drafts": knowledge_drafts}
    except Exception as exc:
        raise _fail(exc, "draft-knowledge-points")


@app.post("/integrate-learning-document")
async def integrate_learning_document(request: LearningDocumentIntegrationRequest):  # noqa: F405
    try:
        learning_document = integrate_learning_document_with_llm(  # noqa: F405
            get_llm(request),
            request.learner_profile,
            request.learning_path,
            request.learning_session,
            request.knowledge_points,
            request.knowledge_drafts,
            request.output_markdown,
        )
        return {"learning_document": learning_document}
    except Exception as exc:
        raise _fail(exc, "integrate-learning-document")


@app.post("/generate-document-quizzes")
async def generate_document_quizzes(request: KnowledgeQuizGenerationRequest):  # noqa: F405
    try:
        document_quiz = generate_document_quizzes_with_llm(  # noqa: F405
            get_llm(request),
            request.learner_profile,
            request.learning_document,
            request.single_choice_count,
            request.multiple_choice_count,
            request.true_false_count,
            request.short_answer_count,
        )
        return {"document_quiz": document_quiz}
    except Exception as exc:
        raise _fail(exc, "generate-document-quizzes")


@app.post("/tailor-knowledge-content")
async def tailor_knowledge_content(request: TailoredContentGenerationRequest):  # noqa: F405
    """Run the whole content pipeline (explore -> draft -> integrate -> quiz)."""
    try:
        tailored_content = create_learning_content_with_llm(  # noqa: F405
            get_llm(request),
            request.learner_profile,
            request.learning_path,
            request.learning_session,
            allow_parallel=request.allow_parallel,
            with_quiz=request.with_quiz,
            use_search=request.use_search,
            max_workers=int(app_config.get("rag", {}).get("max_workers", 3)),
            search_rag_manager=get_search_rag_manager(),
            goal_id=request.goal_id,
        )
        return {"tailored_content": tailored_content}
    except Exception as exc:
        raise _fail(exc, "tailor-knowledge-content")


if __name__ == "__main__":
    server_config = app_config.get("server", {})
    uvicorn.run(
        app,
        host=server_config.get("host", "127.0.0.1"),
        port=int(server_config.get("port", 5000)),
        log_level=str(app_config.get("log_level", "info")).lower(),
    )
