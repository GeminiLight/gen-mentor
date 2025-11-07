import json
import httpx
import streamlit as st
from config import backend_endpoint, use_mock_data, use_search

API_NAMES = {
    "chat_with_tutor": "chat-with-tutor",
    "refine_goal": "refine-learning-goal",
    "identify_skill_gap": "identify-skill-gap-with-info",
    "create_profile": "create-learner-profile-with-info",
    "update_profile": "update-learner-profile",
    "schedule_path": "schedule-learning-path",
    "reschedule_path": "reschedule-learning-path",
    "explore_knowledge_perspectives": "explore-knowledge-perspectives",
    "draft_knowledge_perspective": "draft-knowledge-perspective",
    "draft_point_perspectives": "draft-point-perspectives",
    "integrate_knowledge_document": "integrate-knowledge-document",
    "tailor_learning_content": "tailor-learning-content",
    "explore_knowledge_points": "explore-knowledge-points",
    "draft_knowledge_point": "draft-knowledge-point",
    "draft_knowledge_points": "draft-knowledge-points",
    "integrate_learning_document": "integrate-learning-document",
    "generate_document_quizzes": "generate-document-quizzes",
}


def make_post_request(api_name, data, mock_data_path=None, timeout=500):
    """Send a POST request to the backend API, or return mock data if enabled."""
    if use_mock_data and mock_data_path:
        return json.load(open(mock_data_path))

    backend_url = f"{backend_endpoint}{api_name}"
    try:
        response = httpx.post(backend_url, json=data, timeout=timeout)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.write("Failed to fetch data. Status code:", response.status_code)
            return None
    except Exception as e:
        st.write("Failed to fetch data. Error:", e)
        return {}

def get_available_models(backend_endpoint):
    backend_url = f"{backend_endpoint}list-llm-models"
    try:
        response = httpx.get(backend_url, timeout=30)
        if response.status_code == 200:
            return response.json().get("models", [])
        else:
            # st.write("Failed to fetch available models. Status code:", response.status_code)
            return []
    except Exception as e:
        # st.write("Failed to fetch available models. Error:", e)
        return []

def chat_with_tutor(chat_messages, learner_profile, llm_type="gpt4o", method_name="genmentor"):
    data = {
        "messages": str(chat_messages),
        "learner_profile": str(learner_profile),
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request(API_NAMES["chat_with_tutor"], data, "./assets/data_example/ai)tutor_chat.json")
    return response.get("response") if response else None

def refine_learning_goal(learning_goal, learner_information, llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learning_goal": str(learning_goal),
        "learner_information": str(learner_information),
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request(API_NAMES["refine_goal"], data)
    return response.get("refined_goal") if response else "Refined learning goal"

@st.cache_resource
def identify_skill_gap(learning_goal, learner_information, llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learning_goal": str(learning_goal),
        "learner_information": str(learner_information),
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request(API_NAMES["identify_skill_gap"], data, "./assets/data_example/skill_gap.json")
    return response.get("skill_gaps") if response else None

@st.cache_resource
def create_learner_profile(learning_goal, learner_information, skill_gaps, llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learning_goal": str(learning_goal),
        "learner_information": str(learner_information),
        "skill_gaps": str(skill_gaps),
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request(API_NAMES["create_profile"], data, "./assets/data_example/learner_profile.json")
    return response.get("learner_profile") if response else None

def update_learner_profile(learner_profile, learner_interactions, learner_information="", session_information="", llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learner_profile": str(learner_profile),
        "learner_interactions": str(learner_interactions),
        "learner_information": str(learner_information),
        "session_information": str(session_information),
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request(API_NAMES["update_profile"], data, "./assets/data_example/learner_profile.json")
    return response.get("learner_profile") if response else None

# @st.cache_resource
def schedule_learning_path(learner_profile, session_count, llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learner_profile": str(learner_profile),
        "session_count": session_count,
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request(API_NAMES["schedule_path"], data, "./assets/data_example/learning_path.json")
    return response.get("learning_path") if response else None

def reschedule_learning_path(learning_path, learner_profile, session_count, other_feedback="", llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learning_path": str(learning_path),
        "learner_profile": str(learner_profile),
        "session_count": int(session_count),
        "other_feedback": str(other_feedback),
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request(API_NAMES["reschedule_path"], data, "./assets/data_example/learning_path.json")
    return response.get("rescheduled_learning_path") if response else None

# @st.cache_resource
def generate_document_quizzes(learner_profile, learning_document, single_choice_count, multiple_choice_count, true_false_count, short_answer_count, llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learner_profile": str(learner_profile),
        "learning_document": str(learning_document),
        "single_choice_count": single_choice_count,
        "multiple_choice_count": multiple_choice_count,
        "true_false_count": true_false_count,
        "short_answer_count": short_answer_count,
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request("generate-document-quizzes", data, "./assets/data_example/document_quiz.json")
    return response.get("document_quiz") if response else None

# @st.cache_resource
def explore_knowledge_points(learner_profile, learning_path, learning_session, llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learner_profile": str(learner_profile),
        "learning_path": str(learning_path),
        "learning_session": str(learning_session),
    }
    response = make_post_request("explore-knowledge-points", data, "./assets/data_example/knowledge_points.json")
    return response.get("knowledge_points") if response else None

# @st.cache_resource
def draft_knowledge_point(learner_profile, learning_path, learning_session, knowledge_points, knowledge_point, use_search, llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learner_profile": str(learner_profile),
        "learning_path": str(learning_path),
        "learning_session": str(learning_session),
        "knowledge_points": str(knowledge_points),
        "knowledge_point": str(knowledge_point),
        "use_search": use_search,
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request("draft-knowledge-point", data, "./assets/data_example/knowledge_point.json")
    return response.get("knowledge_draft") if response else None

# @st.cache_resource
def draft_knowledge_points(learner_profile, learning_path, learning_session, knowledge_points, allow_parallel, use_search, llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learner_profile": str(learner_profile),
        "learning_path": str(learning_path),
        "learning_session": str(learning_session),
        "knowledge_points": str(knowledge_points),
        "allow_parallel": allow_parallel,
        "use_search": use_search,
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request("draft-knowledge-points", data, "./assets/data_example/knowledge_points.json")
    return response.get("knowledge_drafts") if response else None

# @st.cache_resource
def integrate_learning_document(learner_profile, learning_path, learning_session, knowledge_points, knowledge_drafts, output_markdown=False, llm_type="gpt4o", method_name="genmentor"):
    data = {
        "learner_profile": str(learner_profile),
        "learning_path": str(learning_path),
        "learning_session": str(learning_session),
        "knowledge_points": str(knowledge_points),
        "knowledge_drafts": str(knowledge_drafts),
        "output_markdown": output_markdown,
        "llm_type": str(llm_type),
        "method_name": str(method_name),
    }
    response = make_post_request("integrate-learning-document", data, "./assets/data_example/learning_document.json")
    if output_markdown:
        return response.get("learning_document") if response else None
    else:
        return response.get("learning_document") if response else None
