"""Tests for the HTTP request models in ``api_schemas.py``.

The interesting behavior is :data:`JsonLike`: it must accept native JSON,
decode the legacy ``str(dict)`` encoding the old Streamlit client sent, decode
``json.dumps`` strings (which can express ``true``/``null``), and leave plain
prose — even bracketed prose — untouched.
"""

from __future__ import annotations

import json

import pytest
from pydantic import ValidationError

import api_schemas
from api_schemas import (
    ChatWithTutorRequest,
    KnowledgeQuizGenerationRequest,
    SkillGapIdentificationRequest,
)


# --- JsonLike dual encoding -------------------------------------------------


def test_native_json_passthrough():
    """A native JSON dict/list arrives as a real Python object, unmodified."""
    payload = {"history": ["a", "b"], "meta": {"turn": 3}}
    request = SkillGapIdentificationRequest(
        learning_goal="learn python",
        learner_information=payload,
    )
    assert request.learner_information == payload

    messages = [{"role": "user", "content": "hello"}]
    chat = ChatWithTutorRequest(messages=messages)
    assert chat.message_list == messages


def test_legacy_str_dict_decoded():
    """The legacy ``str(dict)`` encoding (single quotes) still parses."""
    request = SkillGapIdentificationRequest(
        learning_goal="learn python",
        learner_information="{'goal': 'data science', 'years': 3}",
    )
    assert request.learner_information == {"goal": "data science", "years": 3}

    # Nested containers in the legacy encoding work too.
    nested = ChatWithTutorRequest(messages="[{'role': 'user', 'content': 'hi'}]")
    assert nested.message_list == [{"role": "user", "content": "hi"}]


def test_json_dumps_string_decodes_true_and_null():
    """``json.dumps`` strings round-trip booleans/None, which str(dict) cannot."""
    request = SkillGapIdentificationRequest(
        learning_goal="learn python",
        learner_information='{"flag": true, "missing": null, "count": 0}',
    )
    assert request.learner_information == {"flag": True, "missing": None, "count": 0}

    # A doubly-encoded string (json.dumps of an already-encoded string) is not
    # double-unwrapped: it is a str, so only a leading '[' or '{' triggers parsing.
    dumped = json.dumps({"flag": True, "missing": None})
    assert isinstance(dumped, str)
    request2 = SkillGapIdentificationRequest(
        learning_goal="learn python", learner_information=dumped
    )
    assert request2.learner_information == {"flag": True, "missing": None}


def test_prose_is_not_mangled():
    """Free text survives the coercion untouched, brackets included."""
    prose = "Costs [sic] me time."
    chat = ChatWithTutorRequest(messages=prose)
    assert chat.messages == prose

    leading_bracket = "[sic] it costs me time and {effort}."  # container-lookalike
    chat2 = ChatWithTutorRequest(messages=leading_bracket)
    assert chat2.messages == leading_bracket


def test_unparseable_container_lookalike_degrades_to_raw_string():
    """Text that starts like a container but is not parseable stays a string."""
    for lookalike in ["[hello world]", "{not json", "{'open': 'quote}"]:
        request = SkillGapIdentificationRequest(
            learning_goal="g", learner_information=lookalike
        )
        assert request.learner_information == lookalike


# --- Model selection fields --------------------------------------------------

REQUEST_MODEL_CLASSES = [
    getattr(api_schemas, name)
    for name in api_schemas.__all__
    if name != "JsonLike"
]
# De-duplicate the misspelled backwards-compat alias, which is the same class.
REQUEST_MODEL_CLASSES = list(dict.fromkeys(REQUEST_MODEL_CLASSES))


def test_all_request_models_expose_model_selection_fields():
    """Every request model carries model_provider/model_name for LLM routing."""
    assert REQUEST_MODEL_CLASSES, "no request models discovered"
    for model in REQUEST_MODEL_CLASSES:
        assert issubclass(model, api_schemas.BaseRequest), model
        assert "model_provider" in model.model_fields, model
        assert "model_name" in model.model_fields, model
        # Defaults: no override -> the backend applies its configured default.
        assert model.model_fields["model_provider"].default is None
        assert model.model_fields["model_name"].default is None


def test_model_selection_fields_accept_overrides():
    chat = ChatWithTutorRequest(
        messages=[{"role": "user", "content": "hi"}],
        model_provider="openai",
        model_name="deepseek-chat",
    )
    assert chat.model_provider == "openai"
    assert chat.model_name == "deepseek-chat"
    assert chat.method_name == "genmentor"


# --- Quiz generation bounds ---------------------------------------------------


def _quiz_request(**overrides) -> KnowledgeQuizGenerationRequest:
    payload = {
        "learner_profile": {"name": "x"},
        "learning_document": {"title": "t", "overview": "o", "summary": "s"},
    }
    payload.update(overrides)
    return KnowledgeQuizGenerationRequest(**payload)


def test_quiz_counts_reject_negative():
    with pytest.raises(ValidationError):
        _quiz_request(single_choice_count=-1)
    with pytest.raises(ValidationError):
        _quiz_request(true_false_count=-5)


def test_quiz_counts_reject_above_twenty():
    with pytest.raises(ValidationError):
        _quiz_request(single_choice_count=21)
    with pytest.raises(ValidationError):
        _quiz_request(short_answer_count=99)


def test_quiz_counts_accept_bounds():
    assert _quiz_request(single_choice_count=0).single_choice_count == 0
    assert _quiz_request(single_choice_count=20).single_choice_count == 20


# --- ChatWithTutorRequest.message_list ----------------------------------------


def test_message_list_raises_value_error_on_non_list():
    with pytest.raises(ValueError, match="must be a JSON array"):
        _ = ChatWithTutorRequest(messages="just a string").message_list
    with pytest.raises(ValueError, match="must be a JSON array"):
        _ = ChatWithTutorRequest(messages={"role": "user"}).message_list


def test_message_list_returns_validated_list():
    chat = ChatWithTutorRequest(messages=[{"role": "user", "content": "hi"}])
    assert chat.message_list == [{"role": "user", "content": "hi"}]
