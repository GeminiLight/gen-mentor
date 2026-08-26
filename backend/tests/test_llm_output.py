"""Tests for the LLM output post-processing helpers in ``utils/llm_output.py``."""

from __future__ import annotations

import json

import pytest

from utils.llm_output import (
    convert_json_output,
    extract_think_and_result,
    get_text_from_response,
)


# --- convert_json_output ------------------------------------------------------


def test_clean_dict_passthrough():
    assert convert_json_output('{"a": 1, "b": [true, null]}') == {
        "a": 1,
        "b": [True, None],
    }


def test_clean_list_passthrough():
    """Top-level arrays parse and are returned as-is (not forced into a dict)."""
    assert convert_json_output("[1, 2, 3]") == [1, 2, 3]
    assert convert_json_output('[{"a": 1}, {"a": 2}]') == [{"a": 1}, {"a": 2}]


def test_fenced_json_block():
    fenced = '```json\n{"answer": 42}\n```'
    assert convert_json_output(fenced) == {"answer": 42}


def test_fenced_block_without_language_tag():
    fenced = '```\n{"answer": 42}\n```'
    assert convert_json_output(fenced) == {"answer": 42}


def test_prose_wrapped_single_object():
    noisy = (
        "Sure! Here is the plan you asked for:\n"
        '{"steps": ["read", "practice"], "weeks": 4}\n'
        "Let me know if you want changes."
    )
    assert convert_json_output(noisy) == {"steps": ["read", "practice"], "weeks": 4}


def test_multi_object_span_returns_exactly_one_object():
    """Two objects separated by prose must not be stitched into a broken span."""
    spanned = '{"a": 1} some commentary {"b": 2}'
    result = convert_json_output(spanned)
    assert result in ({"a": 1}, {"b": 2})


def test_garbage_raises_json_decode_error():
    with pytest.raises(json.JSONDecodeError):
        convert_json_output("no structure here at all")


def test_object_embedded_in_markdown_headings():
    noisy = "## Result\n| key | value |\n|---|---|\n" + '{"x": "y"}' + "\nDone."
    assert convert_json_output(noisy) == {"x": "y"}


# --- get_text_from_response ---------------------------------------------------


class _Message:
    def __init__(self, content):
        self.content = content


def test_get_text_from_response_str_guard():
    """A plain string response is returned unchanged (no attribute access)."""
    assert get_text_from_response("just text") == "just text"


def test_get_text_from_response_langgraph_messages():
    response = {"messages": [_Message("older"), _Message("latest answer")]}
    assert get_text_from_response(response) == "latest answer"


def test_get_text_from_response_openai_choices():
    response = {"choices": [{"message": {"content": "chat reply"}}]}
    assert get_text_from_response(response) == "chat reply"
    completion = {"choices": [{"text": "completion text"}]}
    assert get_text_from_response(completion) == "completion text"


# --- extract_think_and_result --------------------------------------------------


def test_extract_think_and_result_strips_think_block():
    raw = "<think>\nstep one: parse\ncrosses lines\n</think>\n\nfinal answer"
    think, result = extract_think_and_result(raw)
    assert think == "step one: parse\ncrosses lines"
    assert result == "final answer"
    assert "<think>" not in result


def test_extract_think_and_result_without_think_block():
    think, result = extract_think_and_result("just the answer")
    assert think == ""
    assert result == "just the answer"
