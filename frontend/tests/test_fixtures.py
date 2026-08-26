"""Structural checks for the mock-data fixtures in ``frontend/assets/data_example``.

Pure stdlib on purpose: no streamlit and no backend imports, so this runs on a
bare Python with only pytest installed.  The set of fixtures is *derived* from
the sources that reference them (``utils/request_api.py`` plus the knowledge
document view), so a fixture referenced in code but missing on disk — or a dead
fixture nobody loads — fails here.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

FRONTEND_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = FRONTEND_ROOT / "assets" / "data_example"
REQUEST_API = FRONTEND_ROOT / "utils" / "request_api.py"
KNOWLEDGE_DOCUMENT_VIEW = FRONTEND_ROOT / "views" / "knowledge_document.py"

# Matches e.g. "./assets/data_example/skill_gap.json" inside string literals.
FIXTURE_REFERENCE = re.compile(r"""["'](\./assets/data_example/[A-Za-z0-9_.\-]+\.json)["']""")

SKILL_GAP_KEYS = {
    "name",
    "is_gap",
    "required_level",
    "current_level",
    "reason",
    "level_confidence",
}
PROFILE_SECTIONS = {
    "learner_information",
    "learning_goal",
    "cognitive_status",
    "learning_preferences",
    "behavioral_patterns",
}
QUIZ_LISTS = (
    "single_choice_questions",
    "multiple_choice_questions",
    "true_false_questions",
    "short_answer_questions",
)


def _referenced_fixture_names(*sources: Path) -> list[str]:
    names = set()
    for source in sources:
        for reference in FIXTURE_REFERENCE.findall(source.read_text(encoding="utf-8")):
            names.add(reference.rsplit("/", 1)[-1])
    return sorted(names)


def _load(name: str) -> dict:
    path = DATA_DIR / name
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _assert_choice_index(option, options) -> None:
    """A correct_option is an index into options, or one of the option texts."""
    if isinstance(option, bool):
        raise AssertionError(f"correct_option must be an index or option text, got {option!r}")
    if isinstance(option, int):
        assert 0 <= option < len(options), f"index {option} out of range for {options!r}"
    else:
        assert option in options, f"{option!r} not among options {options!r}"


def _assert_quiz_lists(quiz: dict, context: str) -> None:
    for key in QUIZ_LISTS:
        assert key in quiz, f"{context}: missing {key}"
        assert isinstance(quiz[key], list), f"{context}: {key} must be a list"

    for question in quiz["single_choice_questions"]:
        assert isinstance(question["question"], str) and question["question"]
        assert isinstance(question["options"], list) and question["options"]
        _assert_choice_index(question["correct_option"], question["options"])
    for question in quiz["multiple_choice_questions"]:
        assert question["options"]
        assert isinstance(question["correct_options"], list) and question["correct_options"]
        for option in question["correct_options"]:
            _assert_choice_index(option, question["options"])
    for question in quiz["true_false_questions"]:
        assert isinstance(question["correct_answer"], bool)
    for question in quiz["short_answer_questions"]:
        assert isinstance(question["expected_answer"], str) and question["expected_answer"]


REFERENCED_FIXTURES = _referenced_fixture_names(REQUEST_API, KNOWLEDGE_DOCUMENT_VIEW)


# --- Referential integrity ------------------------------------------------------


def test_every_referenced_fixture_exists_on_disk():
    assert REFERENCED_FIXTURES, "no fixture references found in request_api.py"
    for name in REFERENCED_FIXTURES:
        assert (DATA_DIR / name).is_file(), f"missing fixture: {name}"


def test_every_fixture_on_disk_is_referenced():
    on_disk = sorted(p.name for p in DATA_DIR.glob("*.json"))
    assert on_disk == REFERENCED_FIXTURES, "dead fixture(s) not referenced by any source"


def test_expected_fixture_set_is_complete():
    # Guards against silently skipping a check when a fixture is renamed.
    assert set(REFERENCED_FIXTURES) == {
        "ai_tutor_chat.json",
        "document_quiz.json",
        "knowledge_document.json",
        "knowledge_drafts.json",
        "knowledge_point.json",
        "knowledge_points.json",
        "learner_profile.json",
        "learning_document.json",
        "learning_path.json",
        "skill_gap.json",
    }


# --- Per-fixture structure --------------------------------------------------------


def test_ai_tutor_chat_fixture():
    data = _load("ai_tutor_chat.json")
    assert "ai_tutor_chat.json" in REFERENCED_FIXTURES
    assert isinstance(data.get("response"), str) and data["response"]


def test_skill_gap_fixture():
    data = _load("skill_gap.json")
    assert "skill_gap.json" in REFERENCED_FIXTURES
    gaps = data["skill_gaps"]
    assert isinstance(gaps, list) and gaps
    for gap in gaps:
        assert isinstance(gap, dict), "each skill gap must be an object"
        assert SKILL_GAP_KEYS <= set(gap), f"missing keys: {SKILL_GAP_KEYS - set(gap)}"
        assert isinstance(gap["is_gap"], bool)
        assert isinstance(gap["name"], str) and gap["name"]


def test_learner_profile_fixture():
    data = _load("learner_profile.json")
    assert "learner_profile.json" in REFERENCED_FIXTURES
    profile = data["learner_profile"]
    assert isinstance(profile, dict)
    assert PROFILE_SECTIONS <= set(profile)
    progress = profile["cognitive_status"]["overall_progress"]
    assert isinstance(progress, int) and not isinstance(progress, bool)
    assert 0 <= progress <= 100
    for section in ("learning_preferences", "behavioral_patterns"):
        assert isinstance(profile[section], dict) and profile[section]


def test_learning_path_fixture():
    data = _load("learning_path.json")
    assert "learning_path.json" in REFERENCED_FIXTURES
    sessions = data["learning_path"]
    assert isinstance(sessions, list) and sessions
    for session in sessions:
        assert isinstance(session, dict)
        for key in ("id", "title", "abstract", "if_learned"):
            assert key in session, f"session missing {key}"
        outcomes = session.get("desired_outcome_when_completed")
        assert isinstance(outcomes, list) and outcomes, (
            "every session must declare what the learner can do when completed"
        )
        for outcome in outcomes:
            assert outcome.get("name") and outcome.get("level")


def test_knowledge_points_fixture():
    data = _load("knowledge_points.json")
    assert "knowledge_points.json" in REFERENCED_FIXTURES
    points = data["knowledge_points"]
    assert isinstance(points, list) and points
    for point in points:
        assert isinstance(point, dict)
        assert isinstance(point.get("name"), str) and point["name"]
        assert isinstance(point.get("type"), str) and point["type"]


def test_knowledge_point_fixture():
    data = _load("knowledge_point.json")
    assert "knowledge_point.json" in REFERENCED_FIXTURES
    draft = data["knowledge_draft"]
    assert isinstance(draft, dict)
    assert isinstance(draft.get("title"), str) and draft["title"]
    assert isinstance(draft.get("content"), str) and draft["content"]


def test_knowledge_drafts_fixture():
    data = _load("knowledge_drafts.json")
    assert "knowledge_drafts.json" in REFERENCED_FIXTURES
    drafts = data["knowledge_drafts"]
    assert isinstance(drafts, list) and drafts
    for draft in drafts:
        assert isinstance(draft, dict)
        assert isinstance(draft.get("title"), str) and draft["title"]
        assert isinstance(draft.get("content"), str) and draft["content"]


def test_learning_document_fixture():
    data = _load("learning_document.json")
    assert "learning_document.json" in REFERENCED_FIXTURES
    document = data["learning_document"]
    assert isinstance(document, dict)
    for key in ("title", "overview", "summary"):
        assert isinstance(document.get(key), str) and document[key], f"missing {key}"


def test_document_quiz_fixture():
    data = _load("document_quiz.json")
    assert "document_quiz.json" in REFERENCED_FIXTURES
    _assert_quiz_lists(data["document_quiz"], "document_quiz.json")


def test_knowledge_document_fixture():
    data = _load("knowledge_document.json")
    assert "knowledge_document.json" in REFERENCED_FIXTURES
    document = data["document"]
    assert isinstance(document, str) and document
    assert "##" in document, "the integrated document must be markdown with headings"
    _assert_quiz_lists(data["quizzes"], "knowledge_document.json quizzes")
