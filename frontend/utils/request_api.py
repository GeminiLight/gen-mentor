"""Typed client for the GenMentor backend API.

Payloads are sent as real JSON. The backend still accepts the historical
``str(dict)`` encoding, but emitting proper JSON means nested structures survive
the round trip without going through ``ast.literal_eval``.
"""

import json

import httpx
import streamlit as st

from config import backend_endpoint, use_mock_data, use_search as default_use_search, asset_path

# Endpoint paths, keyed by the client function that calls them. Every entry here
# must correspond to a route registered in backend/main.py.
API_NAMES = {
    "chat_with_tutor": "chat-with-tutor",
    "refine_goal": "refine-learning-goal",
    "identify_skill_gap": "identify-skill-gap-with-info",
    "create_profile": "create-learner-profile-with-info",
    "update_profile": "update-learner-profile",
    "schedule_path": "schedule-learning-path",
    "reschedule_path": "reschedule-learning-path",
    "explore_knowledge_points": "explore-knowledge-points",
    "draft_knowledge_point": "draft-knowledge-point",
    "draft_knowledge_points": "draft-knowledge-points",
    "integrate_learning_document": "integrate-learning-document",
    "generate_document_quizzes": "generate-document-quizzes",
    "tailor_knowledge_content": "tailor-knowledge-content",
}

DEFAULT_TIMEOUT = 500


def model_selection(llm_type=None):
    """Split a ``"<provider>/<model>"`` selector into backend request fields.

    ``llm_type`` comes from the topbar selectbox, which builds its options as
    ``f"{model_provider}/{model_name}"``. Anything unrecognised (the ``"None"``
    placeholder used before the backend has been reached, or a bare label)
    yields no override, so the backend applies its configured default.
    """
    if not llm_type or llm_type in ("None", "none"):
        return {}
    provider, separator, model_name = str(llm_type).partition("/")
    if not separator:
        return {"model_name": str(llm_type)}
    return {"model_provider": provider, "model_name": model_name}


def make_post_request(api_name, data, mock_data_path=None, timeout=DEFAULT_TIMEOUT):
    """POST to the backend and return the decoded body, or ``None`` on failure."""
    if use_mock_data and mock_data_path:
        # Resolve against the frontend root, not the process CWD, so mock
        # fixtures load no matter where streamlit was launched from.
        with open(asset_path(mock_data_path)) as handle:
            return json.load(handle)

    backend_url = f"{backend_endpoint}{api_name}"
    try:
        response = httpx.post(backend_url, json=data, timeout=timeout)
    except httpx.HTTPError as exc:
        st.error(f"Could not reach the backend at {backend_url}: {exc}")
        return None

    if response.status_code == 200:
        return response.json()

    # FastAPI reports handled errors as {"detail": ...}; fall back to raw text.
    try:
        detail = response.json().get("detail", response.text)
    except ValueError:
        detail = response.text
    st.error(f"Request to {api_name} failed ({response.status_code}): {detail}")
    return None


def get_available_models(backend_endpoint):
    backend_url = f"{backend_endpoint}list-llm-models"
    try:
        response = httpx.get(backend_url, timeout=30)
    except httpx.HTTPError:
        return []
    if response.status_code != 200:
        return []
    return response.json().get("models", [])


def chat_with_tutor(chat_messages, learner_profile, llm_type=None, method_name="genmentor"):
    data = {
        "messages": chat_messages,
        "learner_profile": learner_profile,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(API_NAMES["chat_with_tutor"], data)
    return response.get("response") if response else None


def refine_learning_goal(learning_goal, learner_information, llm_type=None, method_name="genmentor"):
    data = {
        "learning_goal": str(learning_goal),
        "learner_information": learner_information,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(API_NAMES["refine_goal"], data)
    return response.get("refined_goal") if response else "Refined learning goal"


@st.cache_data(show_spinner=False)
def identify_skill_gap(learning_goal, learner_information, llm_type=None, method_name="genmentor"):
    data = {
        "learning_goal": str(learning_goal),
        "learner_information": learner_information,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(
        API_NAMES["identify_skill_gap"], data, "./assets/data_example/skill_gap.json"
    )
    return response.get("skill_gaps") if response else None


@st.cache_data(show_spinner=False)
def create_learner_profile(
    learning_goal, learner_information, skill_gaps, llm_type=None, method_name="genmentor"
):
    data = {
        "learning_goal": str(learning_goal),
        "learner_information": learner_information,
        "skill_gaps": skill_gaps,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(
        API_NAMES["create_profile"], data, "./assets/data_example/learner_profile.json"
    )
    return response.get("learner_profile") if response else None


def update_learner_profile(
    learner_profile,
    learner_interactions,
    learner_information="",
    session_information="",
    llm_type=None,
    method_name="genmentor",
):
    data = {
        "learner_profile": learner_profile,
        "learner_interactions": learner_interactions,
        "learner_information": learner_information,
        "session_information": session_information,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(
        API_NAMES["update_profile"], data, "./assets/data_example/learner_profile.json"
    )
    return response.get("learner_profile") if response else None


def schedule_learning_path(learner_profile, session_count, llm_type=None, method_name="genmentor"):
    data = {
        "learner_profile": learner_profile,
        "session_count": int(session_count),
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(
        API_NAMES["schedule_path"], data, "./assets/data_example/learning_path.json"
    )
    return response.get("learning_path") if response else None


def reschedule_learning_path(
    learning_path,
    learner_profile,
    session_count,
    other_feedback="",
    llm_type=None,
    method_name="genmentor",
):
    data = {
        "learning_path": learning_path,
        "learner_profile": learner_profile,
        "session_count": int(session_count),
        "other_feedback": other_feedback,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(
        API_NAMES["reschedule_path"], data, "./assets/data_example/learning_path.json"
    )
    # The scheduler returns a LearningPath, so the key is `learning_path` for both
    # scheduling and rescheduling.
    return response.get("learning_path") if response else None


def generate_document_quizzes(
    learner_profile,
    learning_document,
    single_choice_count,
    multiple_choice_count,
    true_false_count,
    short_answer_count,
    llm_type=None,
    method_name="genmentor",
):
    data = {
        "learner_profile": learner_profile,
        "learning_document": learning_document,
        "single_choice_count": single_choice_count,
        "multiple_choice_count": multiple_choice_count,
        "true_false_count": true_false_count,
        "short_answer_count": short_answer_count,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(
        API_NAMES["generate_document_quizzes"], data, "./assets/data_example/document_quiz.json"
    )
    return response.get("document_quiz") if response else None


def explore_knowledge_points(
    learner_profile, learning_path, learning_session, llm_type=None, method_name="genmentor"
):
    data = {
        "learner_profile": learner_profile,
        "learning_path": learning_path,
        "learning_session": learning_session,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(
        API_NAMES["explore_knowledge_points"], data, "./assets/data_example/knowledge_points.json"
    )
    return response.get("knowledge_points") if response else None


def draft_knowledge_point(
    learner_profile,
    learning_path,
    learning_session,
    knowledge_points,
    knowledge_point,
    use_search=None,
    llm_type=None,
    method_name="genmentor",
):
    data = {
        "learner_profile": learner_profile,
        "learning_path": learning_path,
        "learning_session": learning_session,
        "knowledge_points": knowledge_points,
        "knowledge_point": knowledge_point,
        "use_search": default_use_search if use_search is None else use_search,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(
        API_NAMES["draft_knowledge_point"], data, "./assets/data_example/knowledge_point.json"
    )
    return response.get("knowledge_draft") if response else None


def draft_knowledge_points(
    learner_profile,
    learning_path,
    learning_session,
    knowledge_points,
    allow_parallel=True,
    use_search=None,
    llm_type=None,
    method_name="genmentor",
):
    data = {
        "learner_profile": learner_profile,
        "learning_path": learning_path,
        "learning_session": learning_session,
        "knowledge_points": knowledge_points,
        "allow_parallel": allow_parallel,
        "use_search": default_use_search if use_search is None else use_search,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(
        API_NAMES["draft_knowledge_points"], data, "./assets/data_example/knowledge_points.json"
    )
    return response.get("knowledge_drafts") if response else None


def integrate_learning_document(
    learner_profile,
    learning_path,
    learning_session,
    knowledge_points,
    knowledge_drafts,
    output_markdown=False,
    llm_type=None,
    method_name="genmentor",
):
    data = {
        "learner_profile": learner_profile,
        "learning_path": learning_path,
        "learning_session": learning_session,
        "knowledge_points": knowledge_points,
        "knowledge_drafts": knowledge_drafts,
        "output_markdown": output_markdown,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(
        API_NAMES["integrate_learning_document"], data, "./assets/data_example/learning_document.json"
    )
    return response.get("learning_document") if response else None


def tailor_knowledge_content(
    learner_profile,
    learning_path,
    learning_session,
    use_search=None,
    allow_parallel=True,
    with_quiz=True,
    llm_type=None,
    method_name="genmentor",
):
    """Run the whole content pipeline server-side in a single request."""
    data = {
        "learner_profile": learner_profile,
        "learning_path": learning_path,
        "learning_session": learning_session,
        "use_search": default_use_search if use_search is None else use_search,
        "allow_parallel": allow_parallel,
        "with_quiz": with_quiz,
        "method_name": method_name,
        **model_selection(llm_type),
    }
    response = make_post_request(API_NAMES["tailor_knowledge_content"], data)
    return response.get("tailored_content") if response else None
