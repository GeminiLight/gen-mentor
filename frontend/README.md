# Frontend of GenMentor

A Streamlit-based UI for GenMentor that guides learners through onboarding, goal refinement, skill-gaps analysis, learning-path scheduling, and in-session knowledge documents with quizzes. It talks to the Python backend over simple HTTP endpoints and can also run in a mock/offline mode using sample JSONs.

## Quick start

Installation

```bash
# from repository root or this folder
cd frontend
uv venv
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

- `backend_endpoint`: Base URL for the backend API (default `http://127.0.0.1:5000/`).
- `use_mock_data`: When `True`, the UI serves sample data from `assets/data_example/` and does not call the backend.
- `use_search`: Allows knowledge drafting to use retrieval/search (sent to backend).

Update these as needed before launching. If you deploy the backend elsewhere, set `backend_endpoint` accordingly.

## Project structure

```text
frontend/
  main.py                 # Streamlit entry. Builds navigation and loads CSS/logo
  config.py               # Frontend configuration flags and API base URL
  requirements.txt        # Python dependencies (Streamlit + extras)
  user_data/              # Legacy local stores (auto-migrated to the backend; *.migrated)
  .streamlit/config.toml  # Streamlit theme/layout defaults

  assets/                 # Static assets and mock data
    css/main.css          # Design system (tokens -> components -> chrome)
    data_example/         # JSON fixtures for mock mode

  components/             # Reusable Streamlit components (chatbot, topbar, gap cards, ...)
  views/                  # App pages: onboarding, learning path, lesson viewer,
                          # goal management, learner profile, knowledge sources, dashboard
  utils/                  # API client, formatting, PDF, state cache, data-store client
```

Key pages (`views/`):

- `onboarding.py`: Collect learner info and set the initial goal.
- `learning_path.py`: View, (re)schedule (session count selectable), and navigate sessions.
- `knowledge_document.py`: Lesson viewer — checkpointed content pipeline, section TOC + pagination, quizzes with submit-all judging, per-goal review list.
- `sources.py`: Knowledge Sources — pages pinned into the goal's durable knowledge base (unpin supported).
- `goal_management.py` / `learner_profile.py` / `dashboard.py`: Goal CRUD, adaptive profile, analytics.

## How it works

- The **backend owns all persisted state** (per-user SQLite behind `/state`; goals deletion cascades into the knowledge base). This side keeps session state as a cache and pushes/pulls snapshots via `utils/data_store.py` -> `utils/state.py`.
- Backend calls are made with `httpx` via `utils/request_api.py`; payloads are native JSON (the backend also accepts legacy string-encoded blobs).
- When `use_mock_data=True`, the app reads JSON fixtures from `assets/data_example/` instead of calling the backend.
- Content generation is checkpointed per stage under the hood: refreshing or restarting resumes from the last completed stage.
- The tutor dialog streams tokens as they are generated.

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
- Keep new code in `components/` when it’s reusable, and page-specific logic under `views/`.
- Prefer small, focused functions in `utils/` for API calls and formatting.
- Avoid heavy work on every rerun. Cache with `@st.cache_data` or `@st.cache_resource` when safe.

## License

This project is released under the repository’s top-level license.
