"""HTTP-level tests for the FastAPI app in ``backend/main.py``.

Every request here fails *before* reaching an LLM: they exercise payload
validation (422), the hand-written guards (400) and the upload path. The RAG
manager is built lazily on first use, so merely importing the app stays cheap
and offline.
"""

from __future__ import annotations

import os
import tempfile

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")

# backend.main resolves the upload directory at import time; redirect it to a
# throwaway directory BEFORE the import so the PDF-upload test writes nothing
# into the repository.
os.environ.setdefault("GENMENTOR_UPLOAD_DIR", tempfile.mkdtemp(prefix="genmentor-test-uploads-"))

from fastapi.testclient import TestClient  # noqa: E402

import main as backend_main  # noqa: E402

EXPECTED_PATH_COUNT = 17

# The canonical routes this suite is written against. Newer endpoints
# (/stats, /chat-with-tutor/stream) are additive and must not remove any of
# these, so the assertion is a superset check rather than an exact count.
CORE_PATHS = {
    "/",
    "/list-llm-models",
    "/chat-with-tutor",
    "/refine-learning-goal",
    "/identify-skill-gap",
    "/identify-skill-gap-with-info",
    "/create-learner-profile",
    "/create-learner-profile-with-info",
    "/update-learner-profile",
    "/schedule-learning-path",
    "/reschedule-learning-path",
    "/explore-knowledge-points",
    "/draft-knowledge-point",
    "/draft-knowledge-points",
    "/integrate-learning-document",
    "/generate-document-quizzes",
    "/tailor-knowledge-content",
}


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(backend_main.app)


def test_root_service_info(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"service": "GenMentor", "status": "ok"}


def test_list_llm_models(client):
    response = client.get("/list-llm-models")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["models"], list) and payload["models"]
    for model in payload["models"]:
        assert {"model_name", "model_provider"} <= set(model)


def test_schedule_learning_path_bad_payload_is_422(client):
    # Missing required learner_profile / session_count -> FastAPI validation.
    response = client.post("/schedule-learning-path", json={})
    assert response.status_code == 422


def test_chat_with_tutor_non_list_messages_is_400(client):
    response = client.post(
        "/chat-with-tutor",
        json={"messages": "just a string, not an array"},
    )
    assert response.status_code == 400
    assert "must be a JSON array" in response.json()["detail"]


def test_draft_knowledge_points_prose_payload_is_400(client):
    """A prose knowledge_points string is rejected, not iterated char by char."""
    response = client.post(
        "/draft-knowledge-points",
        json={
            "learner_profile": "",
            "learning_path": "",
            "learning_session": "",
            "knowledge_points": "just some prose, not a JSON array",
        },
    )
    assert response.status_code == 400
    assert "knowledge_points must be a JSON array" in response.json()["detail"]


def test_identify_skill_gap_with_unreadable_pdf_is_400(client):
    """A non-PDF body uploaded as .pdf is stored, then reported as unreadable."""
    response = client.post(
        "/identify-skill-gap",
        data={"goal": "learn python"},
        files={"cv": ("fake.pdf", b"%PDF-1.4 this is not really a pdf", "application/pdf")},
    )
    assert response.status_code == 400
    assert "Could not read PDF" in response.json()["detail"]
    assert "fake.pdf" in response.json()["detail"]


def test_identify_skill_gap_requires_pdf_extension(client):
    response = client.post(
        "/identify-skill-gap",
        data={"goal": "learn python"},
        files={"cv": ("notes.txt", b"plain text", "text/plain")},
    )
    assert response.status_code == 400
    assert "Only PDF uploads are supported" in response.json()["detail"]


def test_openapi_documents_all_core_paths():
    paths = backend_main.app.openapi()["paths"]
    assert CORE_PATHS <= set(paths)
    assert len(paths) >= EXPECTED_PATH_COUNT
