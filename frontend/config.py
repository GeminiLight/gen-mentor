from pathlib import Path

backend_endpoint = "http://127.0.0.1:5000/"
use_mock_data = False
use_search = True

# Absolute location of this frontend package. Asset paths must resolve against
# it rather than the process CWD, so the app renders identically no matter
# which directory streamlit is launched from.
FRONTEND_ROOT = Path(__file__).resolve().parent


def asset_path(relative: str) -> str:
    """Resolve a frontend-relative path (e.g. ``./assets/...``) to an absolute one.

    Absolute inputs are returned unchanged (``Path.__truediv__`` semantics), so
    callers can pass either form.
    """
    return str((FRONTEND_ROOT / relative).resolve())
