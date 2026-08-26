"""Shared pytest configuration for the backend test suite.

The backend modules live flat under ``backend/`` (``api_schemas``,
``base.*``, ``config``...), so the backend root must be importable when the
tests run.  pytest's ``prepend`` import mode already does this for the
``backend.tests`` package, but the explicit insertion keeps the suite working
under other invocation styles (absolute paths, different rootdir).
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
