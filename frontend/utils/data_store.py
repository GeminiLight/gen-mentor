"""SQLite-backed persistence for the frontend session state.

Replaces the single JSON file (user_data/data_store.json): WAL journaling and
per-key upserts make concurrent tabs last-write-wins per key instead of
clobbering the whole file, and the mastery history becomes real-timestamped
rows instead of wall-clock samples.

Layout (key -> table routing):
    goals                    -> goals(id, data)
    learned_skills_history   -> mastery_history(goal_id, ts, rate)
    document_caches /        -> blobs(kind, uid, data)   one row per uid
    content_pipeline_state /
    session_learning_times
    quiz_results_* (any key starting with that prefix)
    everything else          -> kv(key, value)

The first load migrates an existing data_store.json in place and renames it
to .migrated (kept as a backup).
"""

from __future__ import annotations

import json
import logging
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS goals (id INTEGER PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS blobs (
    kind TEXT NOT NULL,
    uid TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (kind, uid)
);
CREATE TABLE IF NOT EXISTS mastery_history (
    goal_id INTEGER NOT NULL,
    ts REAL NOT NULL,
    rate REAL NOT NULL,
    PRIMARY KEY (goal_id, ts)
);
"""

# Top-level session keys whose value is a {uid: blob} mapping.
_DICT_OF_BLOBS = {"document_caches", "content_pipeline_state", "session_learning_times"}
_QUIZ_PREFIX = "quiz_results_"


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=5.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=3000")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(_SCHEMA)
    conn.commit()


def _dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _load(value: str) -> Any:
    return json.loads(value)


def save_snapshot(path: Path, snapshot: Dict[str, Any]) -> bool:
    """Persist one full state snapshot, routing each key to its table."""
    try:
        conn = _connect(path)
        try:
            _ensure_schema(conn)
            with conn:
                # goals (upsert; drop rows whose id disappeared this session)
                goals = snapshot.get("goals") or []
                keep_ids = []
                for goal in goals if isinstance(goals, list) else []:
                    gid = goal.get("id") if isinstance(goal, dict) else None
                    if gid is None:
                        continue
                    keep_ids.append(int(gid))
                    conn.execute(
                        "INSERT INTO goals(id, data) VALUES(?, ?) "
                        "ON CONFLICT(id) DO UPDATE SET data=excluded.data",
                        (int(gid), _dump(goal)),
                    )
                if keep_ids:
                    conn.execute(
                        f"DELETE FROM goals WHERE id NOT IN ({','.join('?' * len(keep_ids))})",
                        keep_ids,
                    )
                else:
                    conn.execute("DELETE FROM goals")

                # mastery history: replace-all (small table, real timestamps)
                conn.execute("DELETE FROM mastery_history")
                history = snapshot.get("learned_skills_history") or {}
                if isinstance(history, dict):
                    rows = []
                    for gid, entries in history.items():
                        if not isinstance(entries, list):
                            continue
                        for entry in entries:
                            if isinstance(entry, dict) and "rate" in entry:
                                rows.append((int(gid), float(entry.get("ts", 0.0) or 0.0),
                                             float(entry["rate"])))
                            elif isinstance(entry, (int, float)):
                                # legacy plain-rate entries: stamp them now
                                rows.append((int(gid), time.time(), float(entry)))
                    conn.executemany(
                        "INSERT OR REPLACE INTO mastery_history(goal_id, ts, rate) VALUES(?, ?, ?)",
                        rows,
                    )

                # uid-keyed blob maps and quiz_results_* keys
                for key in _DICT_OF_BLOBS:
                    mapping = snapshot.get(key)
                    if not isinstance(mapping, dict):
                        continue
                    conn.execute("DELETE FROM blobs WHERE kind=?", (key,))
                    conn.executemany(
                        "INSERT OR REPLACE INTO blobs(kind, uid, data) VALUES(?, ?, ?)",
                        [(key, str(uid), _dump(blob)) for uid, blob in mapping.items()],
                    )
                for key, value in snapshot.items():
                    if key.startswith(_QUIZ_PREFIX):
                        conn.execute(
                            "INSERT OR REPLACE INTO blobs(kind, uid, data) VALUES(?, ?, ?)",
                            ("quiz_results", key, _dump(value)),
                        )

                # simple keys -> kv
                skip = _DICT_OF_BLOBS | {"goals", "learned_skills_history"}
                kv_rows = [
                    (key, _dump(value))
                    for key, value in snapshot.items()
                    if key not in skip and not key.startswith(_QUIZ_PREFIX)
                ]
                conn.executemany(
                    "INSERT INTO kv(key, value) VALUES(?, ?) "
                    "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    kv_rows,
                )
        finally:
            conn.close()
        return True
    except (sqlite3.Error, TypeError, ValueError) as exc:
        logger.error("Could not persist state to %s: %s", path, exc, exc_info=True)
        return False


def load_snapshot(path: Path) -> Dict[str, Any]:
    """Read the whole store back into the snapshot dict shape.

    Migrates an existing JSON store on first use. Returns {} when there is
    nothing to restore (fresh install or unreadable store — logged).
    """
    legacy_json = path.parent / "data_store.json"
    try:
        conn = _connect(path)
        try:
            _ensure_schema(conn)
            fresh = conn.execute("SELECT COUNT(*) FROM kv").fetchone()[0] == 0 \
                and conn.execute("SELECT COUNT(*) FROM goals").fetchone()[0] == 0
            if fresh and legacy_json.exists():
                _migrate_json(conn, legacy_json)
            snapshot: Dict[str, Any] = {}

            for key, value in conn.execute("SELECT key, value FROM kv"):
                snapshot[key] = _load(value)
            snapshot["goals"] = [
                _load(row[0]) for row in
                conn.execute("SELECT data FROM goals ORDER BY id")
            ]
            history: Dict[str, List[Dict[str, Any]]] = {}
            for gid, ts, rate in conn.execute(
                "SELECT goal_id, ts, rate FROM mastery_history ORDER BY goal_id, ts"
            ):
                history.setdefault(str(gid), []).append({"ts": ts, "rate": rate})
            snapshot["learned_skills_history"] = history

            for kind in _DICT_OF_BLOBS:
                mapping = {
                    uid: _load(data) for uid, data in
                    conn.execute("SELECT uid, data FROM blobs WHERE kind=?", (kind,))
                }
                if mapping or kind in snapshot:
                    snapshot[kind] = mapping
            for uid_key, data in conn.execute(
                "SELECT uid, data FROM blobs WHERE kind='quiz_results'"
            ):
                snapshot[uid_key] = _load(data)
            return snapshot
        finally:
            conn.close()
    except (sqlite3.Error, ValueError) as exc:
        logger.error("Could not read persisted state from %s: %s", path, exc, exc_info=True)
        return {}


def _migrate_json(conn: sqlite3.Connection, legacy_json: Path) -> None:
    """Import the old flat-JSON store once, then park it as a backup."""
    try:
        data = json.loads(legacy_json.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        logger.error("Legacy store %s unreadable, skipping migration: %s", legacy_json, exc)
        return
    if not isinstance(data, dict):
        logger.error("Legacy store %s is not a JSON object, skipping migration.", legacy_json)
        return
    with conn:
        for key, value in data.items():
            if key == "goals" and isinstance(value, list):
                for goal in value:
                    if isinstance(goal, dict) and goal.get("id") is not None:
                        conn.execute(
                            "INSERT OR REPLACE INTO goals(id, data) VALUES(?, ?)",
                            (int(goal["id"]), _dump(goal)),
                        )
            elif key == "learned_skills_history" and isinstance(value, dict):
                for gid, entries in value.items():
                    if isinstance(entries, list):
                        for entry in entries:
                            ts, rate = (time.time(), float(entry)) if isinstance(entry, (int, float)) \
                                else (float(entry.get("ts", 0.0) or 0.0), float(entry.get("rate", 0.0)))
                            conn.execute(
                                "INSERT OR REPLACE INTO mastery_history(goal_id, ts, rate) VALUES(?, ?, ?)",
                                (int(gid), ts, rate),
                            )
            elif key in _DICT_OF_BLOBS and isinstance(value, dict):
                conn.executemany(
                    "INSERT OR REPLACE INTO blobs(kind, uid, data) VALUES(?, ?, ?)",
                    [(key, str(uid), _dump(blob)) for uid, blob in value.items()],
                )
            else:
                conn.execute(
                    "INSERT OR REPLACE INTO kv(key, value) VALUES(?, ?)", (key, _dump(value))
                )
    backup = legacy_json.with_suffix(".json.migrated")
    try:
        legacy_json.rename(backup)
        logger.info("Migrated legacy JSON store to SQLite; original kept at %s", backup)
    except OSError as exc:
        logger.warning("Migrated store but could not rename %s: %s", legacy_json, exc)


def db_files(path: Path) -> List[Path]:
    """The db plus its WAL/SHM siblings (for archive/reset flows)."""
    return [path, Path(str(path) + "-wal"), Path(str(path) + "-shm")]
