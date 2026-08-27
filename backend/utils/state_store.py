"""Server-owned persistence for frontend session state.

The store moved to the backend so the data follows the service, not the UI
process: every table is keyed by user_id, the frontend keeps only a
session_state cache, and goal removal can cascade into the knowledge base.

Snapshot shape (identical to what the frontend holds in session_state):
    goals                    -> goals(user_id, id, data)
    learned_skills_history   -> mastery_history(user_id, goal_id, ts, rate)
    document_caches /        -> blobs(user_id, kind, uid, data)
    content_pipeline_state /
    session_learning_times
    quiz_results_* (any key starting with that prefix)
    everything else          -> kv(user_id, key, value)

SQLite with WAL: the frontend saves whole snapshots on most interactions, so
per-key upserts (rather than a single JSON blob row) keep concurrent users
from clobbering each other.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS kv (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);
CREATE TABLE IF NOT EXISTS goals (
    user_id TEXT NOT NULL,
    id INTEGER NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS blobs (
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    uid TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (user_id, kind, uid)
);
CREATE TABLE IF NOT EXISTS mastery_history (
    user_id TEXT NOT NULL,
    goal_id INTEGER NOT NULL,
    ts REAL NOT NULL,
    rate REAL NOT NULL,
    PRIMARY KEY (user_id, goal_id, ts)
);
CREATE TABLE IF NOT EXISTS state_backups (
    user_id TEXT NOT NULL,
    created_at REAL NOT NULL,
    snapshot TEXT NOT NULL,
    PRIMARY KEY (user_id, created_at)
);
"""

# Top-level snapshot keys whose value is a {uid: blob} mapping.
_DICT_OF_BLOBS = {"document_caches", "content_pipeline_state", "session_learning_times"}
_QUIZ_PREFIX = "quiz_results_"

DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "data" / "genmentor_state.db"


def db_path() -> Path:
    """The store location; overridable via GENMENTOR_STATE_DB for deployments."""
    return Path(os.getenv("GENMENTOR_STATE_DB", DEFAULT_DB_PATH))


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=5.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=3000")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def _dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _load(value: str) -> Any:
    return json.loads(value)


def save_snapshot(user_id: str, snapshot: Dict[str, Any]) -> Tuple[bool, Set[int]]:
    """Persist one user's full snapshot.

    Returns (ok, removed_goal_ids): goal ids that existed before this save but
    are gone (or soft-deleted) now — the caller cascades them out of the
    knowledge base.
    """
    user_id = str(user_id)
    try:
        conn = _connect(db_path())
        try:
            conn.executescript(_SCHEMA)
            with conn:
                before = {
                    row[0] for row in conn.execute(
                        "SELECT id FROM goals WHERE user_id=?", (user_id,)
                    )
                }
                goals = snapshot.get("goals") or []
                keep: Set[int] = set()
                for goal in goals if isinstance(goals, list) else []:
                    if not isinstance(goal, dict) or goal.get("id") is None:
                        continue
                    gid = int(goal["id"])
                    keep.add(gid)
                    conn.execute(
                        "INSERT INTO goals(user_id, id, data) VALUES(?, ?, ?) "
                        "ON CONFLICT(user_id, id) DO UPDATE SET data=excluded.data",
                        (user_id, gid, _dump(goal)),
                    )
                conn.execute(
                    "DELETE FROM goals WHERE user_id=?"
                    + (f" AND id NOT IN ({','.join('?' * len(keep))})" if keep else ""),
                    (user_id, *keep),
                )
                removed = {gid for gid in before if gid not in keep}
                # Soft-deleted goals (is_deleted) are treated as removed for KB
                # cascade purposes but their rows stay for potential restore.
                for goal in goals if isinstance(goals, list) else []:
                    if isinstance(goal, dict) and goal.get("is_deleted"):
                        try:
                            removed.add(int(goal["id"]))
                        except (TypeError, ValueError):
                            pass

                conn.execute("DELETE FROM mastery_history WHERE user_id=?", (user_id,))
                history = snapshot.get("learned_skills_history") or {}
                if isinstance(history, dict):
                    rows = []
                    for gid, entries in history.items():
                        if not isinstance(entries, list):
                            continue
                        for entry in entries:
                            if isinstance(entry, dict) and "rate" in entry:
                                rows.append((user_id, int(gid),
                                             float(entry.get("ts", 0.0) or 0.0),
                                             float(entry["rate"])))
                            elif isinstance(entry, (int, float)):
                                rows.append((user_id, int(gid), time.time(), float(entry)))
                    conn.executemany(
                        "INSERT OR REPLACE INTO mastery_history(user_id, goal_id, ts, rate) "
                        "VALUES(?, ?, ?, ?)", rows,
                    )

                for key in _DICT_OF_BLOBS:
                    mapping = snapshot.get(key)
                    if not isinstance(mapping, dict):
                        continue
                    conn.execute("DELETE FROM blobs WHERE user_id=? AND kind=?", (user_id, key))
                    conn.executemany(
                        "INSERT OR REPLACE INTO blobs(user_id, kind, uid, data) VALUES(?, ?, ?, ?)",
                        [(user_id, key, str(uid), _dump(blob)) for uid, blob in mapping.items()],
                    )
                for key, value in snapshot.items():
                    if key.startswith(_QUIZ_PREFIX):
                        conn.execute(
                            "INSERT OR REPLACE INTO blobs(user_id, kind, uid, data) VALUES(?, ?, ?, ?)",
                            (user_id, "quiz_results", key, _dump(value)),
                        )

                skip = _DICT_OF_BLOBS | {"goals", "learned_skills_history"}
                conn.executemany(
                    "INSERT INTO kv(user_id, key, value) VALUES(?, ?, ?) "
                    "ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value",
                    [(user_id, key, _dump(value))
                     for key, value in snapshot.items()
                     if key not in skip and not key.startswith(_QUIZ_PREFIX)],
                )
        finally:
            conn.close()
        return True, removed
    except (sqlite3.Error, TypeError, ValueError) as exc:
        logger.error("Could not persist state for user %s: %s", user_id, exc, exc_info=True)
        return False, set()


def load_snapshot(user_id: str) -> Dict[str, Any]:
    """Read one user's snapshot back; {} when the user has no state yet."""
    user_id = str(user_id)
    path = db_path()
    if not path.exists():
        return {}
    try:
        conn = _connect(path)
        try:
            conn.executescript(_SCHEMA)
            snapshot: Dict[str, Any] = {}
            for key, value in conn.execute(
                "SELECT key, value FROM kv WHERE user_id=?", (user_id,)
            ):
                snapshot[key] = _load(value)
            snapshot["goals"] = [
                _load(row[0]) for row in
                conn.execute("SELECT data FROM goals WHERE user_id=? ORDER BY id", (user_id,))
            ]
            history: Dict[str, List[Dict[str, Any]]] = {}
            for gid, ts, rate in conn.execute(
                "SELECT goal_id, ts, rate FROM mastery_history WHERE user_id=? "
                "ORDER BY goal_id, ts", (user_id,),
            ):
                history.setdefault(str(gid), []).append({"ts": ts, "rate": rate})
            snapshot["learned_skills_history"] = history
            for kind in _DICT_OF_BLOBS:
                mapping = {
                    uid: _load(data) for uid, data in conn.execute(
                        "SELECT uid, data FROM blobs WHERE user_id=? AND kind=?", (user_id, kind)
                    )
                }
                if mapping:
                    snapshot[kind] = mapping
            for uid_key, data in conn.execute(
                "SELECT uid, data FROM blobs WHERE user_id=? AND kind='quiz_results'", (user_id,)
            ):
                snapshot[uid_key] = _load(data)
            return snapshot
        finally:
            conn.close()
    except (sqlite3.Error, ValueError) as exc:
        logger.error("Could not read state for user %s: %s", user_id, exc, exc_info=True)
        return {}


def reset_user(user_id: str) -> bool:
    """Archive the user's snapshot into state_backups, then wipe their rows.

    The archive-first ordering mirrors the frontend's reset semantics: a failed
    backup leaves the data in place rather than destroying it.
    """
    user_id = str(user_id)
    try:
        snapshot = load_snapshot(user_id)
        conn = _connect(db_path())
        try:
            conn.executescript(_SCHEMA)
            with conn:
                if snapshot:
                    conn.execute(
                        "INSERT OR REPLACE INTO state_backups(user_id, created_at, snapshot) "
                        "VALUES(?, ?, ?)",
                        (user_id, time.time(), _dump(snapshot)),
                    )
                for table, where in (
                    ("kv", "user_id=?"), ("goals", "user_id=?"),
                    ("blobs", "user_id=?"), ("mastery_history", "user_id=?"),
                ):
                    conn.execute(f"DELETE FROM {table} WHERE {where}", (user_id,))
        finally:
            conn.close()
        return True
    except sqlite3.Error as exc:
        logger.error("Could not reset state for user %s: %s", user_id, exc, exc_info=True)
        return False


def goal_ids_for_user(user_id: str) -> Set[int]:
    try:
        conn = _connect(db_path())
        try:
            return {row[0] for row in conn.execute(
                "SELECT id FROM goals WHERE user_id=?", (str(user_id),)
            )}
        finally:
            conn.close()
    except sqlite3.Error:
        return set()
