# Frontend of GenMentor

A Streamlit-based UI for GenMentor that guides learners through onboarding, goal refinement, skill-gaps analysis, learning-path scheduling, and in-session knowledge documents with quizzes. It talks to the Python backend over simple HTTP endpoints and can also run in a mock/offline mode using sample JSONs.

## Quick start

Installation

```bash
# from repository root or this folder
cd frontend
uv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
```

Then launch the app:

```bash
# Option A: run against a live backend (default)
#   Make sure the backend server is up (see ../backend)
streamlit run main.py

# Option B: run using mock data (no backend needed)
#   Edit config.py: set use_mock_data = True
streamlit run main.py
```

The app will open at <http://localhost:8501> by default.

## Configuration

All UI-related toggles live in `config.py`:

- `backend_endpoint`: Base URL for the backend API (default `http://127.0.0.1:5006/`).
- `use_mock_data`: When `True`, the UI serves sample data from `assets/data_example/` and does not call the backend.
- `use_search`: Allows knowledge drafting to use retrieval/search (sent to backend).

Update these as needed before launching. If you deploy the backend elsewhere, set `backend_endpoint` accordingly.

## Project structure

```text
frontend/
  main.py                 # Streamlit entry. Builds navigation and loads CSS/logo
  config.py               # Frontend configuration flags and API base URL
  requirements.txt        # Python dependencies (Streamlit + extras)
  data_store.json         # Persistent UI state (created/updated by the app)
  .streamlit/config.toml  # Streamlit theme/layout defaults

  assets/                 # Static assets and mock data
    css/                  # UI styles
    data_example/         # JSON fixtures for mock mode

  components/             # Reusable Streamlit components (chatbot, time tracking, etc.)
  pages/                  # Multi-page app: onboarding, learning path, knowledge document, dashboard, ...
  utils/                  # Helpers: API requests, formatting, PDF, state management, colors
```

Key pages:

- `pages/onboarding.py`: Collect learner info and set initial goal.
- `pages/learning_path.py`: View, (re)schedule, and navigate sessions.
- `pages/knowledge_document.py`: In-session reading experience with a document TOC, pagination, and quizzes.
- `pages/goal_management.py`: Manage/refine goals.
- `pages/dashboard.py`: Basic analytics overview.

## How it works

- UI state is stored in Streamlit `st.session_state` and persisted to `data_store.json` via utilities in `utils/state.py`.
- Backend calls are made with `httpx` via `utils/request_api.py` using endpoints under `config.backend_endpoint`.
- When `use_mock_data=True`, the app reads JSON fixtures from `assets/data_example/` instead of calling the backend.
- The knowledge document page supports section-by-section pagination, a clickable sidebar TOC, and auto-scroll to anchors.

## Common tasks

- Switch to mock mode:

  1. Open `config.py`
  2. Set `use_mock_data = True`
  3. Run `streamlit run main.py`

- Point frontend to a remote backend:

  1. Open `config.py`
  2. Set `backend_endpoint = "http://<host>:<port>/"`

- Change default theme/layout:

  - Edit `.streamlit/config.toml` (e.g., theme colors, base font).

## Troubleshooting

- Backend 404/500 errors in the UI:
  - Ensure the backend server is running and `backend_endpoint` is correct.
  - Check server logs for the specific API path (see `API_NAMES` in `utils/request_api.py`).

- CSS not applied:
  - Confirm `assets/css/main.css` exists and that `main.py` runs from the `frontend/` directory so relative paths resolve.

- HTTP timeouts:
  - Long LLM requests may take time. Increase `timeout` values in `utils/request_api.py` as needed.

- Streamlit version mismatches:
  - Use the pinned versions in `requirements.txt`. Reinstall with `pip install -r requirements.txt`.

## Development tips

- Streamlit auto-reloads on file save. Keep logs visible in the terminal.
- Keep new code in `components/` when it’s reusable, and page-specific logic under `pages/`.
- Prefer small, focused functions in `utils/` for API calls and formatting.
- Avoid heavy work on every rerun. Cache with `@st.cache_data` or `@st.cache_resource` when safe.

## License

This project is released under the repository’s top-level license.
