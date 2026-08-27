"""State persistence client: the store lives in the BACKEND, not here.

The frontend keeps session_state as a cache and pushes/pulls whole snapshots
over the state API (GET/PUT /state, DELETE /state/{user_id}). The backend owns
the SQLite file, keys everything by user, and cascades goal deletion into the
knowledge base.

One-time migration: the first successful contact with an EMPTY remote store
uploads whatever legacy state exists locally (the old SQLite db or, older
still, the JSON file) and parks the local copy as *.migrated — so upgrading
users keep their data. If the backend is unreachable, callers degrade to a
fresh session (logged) and the migration is retried on a later run.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from pathlib import Path
from typing import Any, Dict, Optional

import httpx

import config

logger = logging.getLogger(__name__)

USER_DATA_DIR = Path(__file__).resolve().parents[1] / "user_data"
_LOCAL_DB = USER_DATA_DIR / "data_store.db"
_LOCAL_JSON = USER_DATA_DIR / "data_store.json"

_DICT_OF_BLOBS = {"document_caches", "content_pipeline_state", "session_learning_times"}
_QUIZ_PREFIX = "quiz_results_"
_TIMEOUT = 30


def _base_url() -> str:
    # Local import keeps this module importable without streamlit (tests).
    try:
        import streamlit as st

        endpoint = st.session_state.get("backend_endpoint") or config.backend_endpoint
    except Exception:
        endpoint = config.backend_endpoint
    return str(endpoint).rstrip("/") + "/"


def _remote_is_empty(snapshot: Dict[str, Any]) -> bool:
    """True when the backend holds nothing meaningful for this user."""
    if not isinstance(snapshot, dict):
        return True
    if snapshot.get("goals"):
        return False
    structural = {"goals", "learned_skills_history"}
    return not any(k for k in snapshot if k not in structural)


# ------------------------------------------------------------------
# backend API
# ------------------------------------------------------------------

def load_state(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch the user's snapshot.

    Returns None when the backend is unreachable (distinct from {} which means
    "reachable and genuinely empty") — callers use that distinction to refuse
    saving an unvalidated empty session over server-side data.
    """
    try:
        response = httpx.get(f"{_base_url()}state", params={"user_id": str(user_id)},
                             timeout=_TIMEOUT)
        response.raise_for_status()
        snapshot = response.json().get("snapshot") or {}
    except httpx.HTTPError as exc:
        logger.warning("State backend unreachable, starting with empty state: %s", exc)
        return None
    if _remote_is_empty(snapshot):
        migrated = _migrate_local_if_any(str(user_id))
        if migrated:
            return migrated
    return snapshot


def save_state(user_id: str, snapshot: Dict[str, Any]) -> bool:
    try:
        response = httpx.put(f"{_base_url()}state",
                             json={"user_id": str(user_id), "snapshot": snapshot},
                             timeout=_TIMEOUT)
        return response.status_code == 200
    except httpx.HTTPError as exc:
        logger.warning("Could not persist state to backend: %s", exc)
        return False


def reset_state(user_id: str) -> bool:
    """Archive + wipe the user's server-side state (the Reset flow)."""
    try:
        response = httpx.delete(f"{_base_url()}state/{user_id}", timeout=_TIMEOUT)
        return response.status_code == 200
    except httpx.HTTPError as exc:
        logger.error("Could not reset backend state: %s", exc)
        return False


# ------------------------------------------------------------------
# one-time local -> backend migration
# ------------------------------------------------------------------

def _migrate_local_if_any(user_id: str) -> Dict[str, Any]:
    """Upload legacy local state to the empty backend; returns it on success."""
    snapshot = _read_local_snapshot()
    if not snapshot or _remote_is_empty(snapshot):
        return {}
    if not save_state(user_id, snapshot):
        return {}  # backend flaked mid-migration: retry next run
    for path in (_LOCAL_DB, Path(str(_LOCAL_DB) + "-wal"), Path(str(_LOCAL_DB) + "-shm")):
        if path.exists():
            path.rename(path.with_name(path.name + ".migrated"))
    if _LOCAL_JSON.exists():
        _LOCAL_JSON.rename(_LOCAL_JSON.with_name(_LOCAL_JSON.name + ".migrated"))
    logger.info("Migrated local state to the backend store (local copy parked as .migrated).")
    return snapshot


def _read_local_snapshot() -> Dict[str, Any]:
    """Read the legacy local store: SQLite first, falling back to the JSON file."""
    if _LOCAL_DB.exists():
        try:
            return _read_local_sqlite(_LOCAL_DB)
        except (sqlite3.Error, ValueError) as exc:
            logger.error("Legacy store %s unreadable: %s", _LOCAL_DB, exc)
    if _LOCAL_JSON.exists():
        try:
            data = json.loads(_LOCAL_JSON.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError) as exc:
            logger.error("Legacy store %s unreadable: %s", _LOCAL_JSON, exc)
    return {}


def _read_local_sqlite(path: Path) -> Dict[str, Any]:
    conn = sqlite3.connect(path, timeout=5.0)
    try:
        snapshot: Dict[str, Any] = {}
        for key, value in conn.execute("SELECT key, value FROM kv"):
            snapshot[key] = json.loads(value)
        snapshot["goals"] = [
            json.loads(row[0]) for row in conn.execute("SELECT data FROM goals ORDER BY id")
        ]
        history: Dict[str, Any] = {}
        for gid, ts, rate in conn.execute(
            "SELECT goal_id, ts, rate FROM mastery_history ORDER BY goal_id, ts"
        ):
            history.setdefault(str(gid), []).append({"ts": ts, "rate": rate})
        snapshot["learned_skills_history"] = history
        for kind in _DICT_OF_BLOBS:
            mapping = {
                uid: json.loads(data) for uid, data in
                conn.execute("SELECT uid, data FROM blobs WHERE kind=?", (kind,))
            }
            if mapping:
                snapshot[kind] = mapping
        for uid_key, data in conn.execute(
            "SELECT uid, data FROM blobs WHERE kind='quiz_results'"
        ):
            snapshot[uid_key] = json.loads(data)
        return snapshot
    finally:
        conn.close()
