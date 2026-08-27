"""Tests for the server-owned state store and its /state endpoints."""

import pytest


@pytest.fixture()
def state_db(tmp_path, monkeypatch):
    """Point the store at a temp db for the duration of a test."""
    monkeypatch.setenv("GENMENTOR_STATE_DB", str(tmp_path / "state.db"))
    from utils import state_store

    state_store.DEFAULT_DB_PATH = tmp_path / "state.db"
    return state_store


@pytest.fixture()
def client(state_db, monkeypatch):
    """TestClient with the RAG manager stubbed out (no model load)."""
    import main

    calls = {"unpinned": []}
    fake_manager = type(
        "M", (), {"unpin_goal": staticmethod(lambda gid: calls["unpinned"].append(gid) or 1)}
    )()
    monkeypatch.setattr(main, "get_search_rag_manager", lambda: fake_manager)
    from fastapi.testclient import TestClient

    return TestClient(main.app), calls


SNAP = {
    "goals": [
        {"id": 0, "learning_goal": "a", "is_deleted": False},
        {"id": 1, "learning_goal": "b", "is_deleted": False},
    ],
    "llm_type": "m1",
    "document_caches": {"0-1": {"document": "# x"}},
    "learned_skills_history": {"0": [{"ts": 1.0, "rate": 0.5}]},
    "quiz_results_0-1": {"single_choice": {"answered": 1, "correct": 1}},
}


def test_round_trip_all_shapes(client):
    c, _ = client
    r = c.put("/state", json={"user_id": "u", "snapshot": SNAP})
    assert r.status_code == 200
    snap = c.get("/state", params={"user_id": "u"}).json()["snapshot"]
    assert [g["id"] for g in snap["goals"]] == [0, 1]
    assert snap["llm_type"] == "m1"
    assert snap["document_caches"]["0-1"]["document"] == "# x"
    assert snap["quiz_results_0-1"]["single_choice"]["correct"] == 1
    assert snap["learned_skills_history"]["0"] == [{"ts": 1.0, "rate": 0.5}]


def test_users_are_isolated(client):
    c, _ = client
    c.put("/state", json={"user_id": "u1", "snapshot": SNAP})
    c.put("/state", json={"user_id": "u2", "snapshot": {"goals": [], "llm_type": "other"}})
    assert c.get("/state", params={"user_id": "u1"}).json()["snapshot"]["llm_type"] == "m1"
    assert c.get("/state", params={"user_id": "u2"}).json()["snapshot"]["llm_type"] == "other"


def test_non_dict_snapshot_is_rejected_not_treated_as_empty(client):
    """A malformed payload must never wipe the stored state."""
    c, _ = client
    c.put("/state", json={"user_id": "u", "snapshot": SNAP})
    r = c.put("/state", json={"user_id": "u", "snapshot": ["not", "a", "dict"]})
    assert r.status_code == 400
    # stored data untouched
    assert c.get("/state", params={"user_id": "u"}).json()["snapshot"]["goals"]


def test_goal_removal_cascades_into_knowledge_base(client):
    c, calls = client
    c.put("/state", json={"user_id": "u", "snapshot": SNAP})
    r = c.put("/state", json={"user_id": "u", "snapshot": {
        **SNAP, "goals": [{"id": 0, "learning_goal": "a", "is_deleted": False}]}})
    assert r.status_code == 200
    assert set(r.json()["cascaded_goals"]) == {1}
    assert calls["unpinned"] == ["1"]  # unpin_goal takes str goal ids


def test_soft_deleted_goal_cascades(client):
    c, calls = client
    c.put("/state", json={"user_id": "u", "snapshot": SNAP})
    r = c.put("/state", json={"user_id": "u", "snapshot": {
        **SNAP, "goals": [{**SNAP["goals"][0], "is_deleted": True}, SNAP["goals"][1]]}})
    assert set(r.json()["cascaded_goals"]) == {0}


def test_reset_archives_then_wipes(client):
    c, _ = client
    import sqlite3

    from utils import state_store

    c.put("/state", json={"user_id": "u", "snapshot": SNAP})
    assert c.delete("/state/u").status_code == 200
    snap = c.get("/state", params={"user_id": "u"}).json()["snapshot"]
    assert snap.get("goals", []) == [] and "llm_type" not in snap
    conn = sqlite3.connect(state_store.db_path())
    backups = conn.execute("SELECT COUNT(*) FROM state_backups WHERE user_id='u'").fetchone()[0]
    conn.close()
    assert backups == 1


def test_store_goal_ids_survive_reset_collection(client):
    """/state/{uid} reset collects ids BEFORE wiping so KB cascade can run."""
    c, calls = client
    c.put("/state", json={"user_id": "u", "snapshot": SNAP})
    c.delete("/state/u")
    assert sorted(calls["unpinned"]) == ["0", "1"]  # str goal ids
