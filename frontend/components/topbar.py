import streamlit as st
import config
from utils.state import save_persistent_state
import requests
import re
from pathlib import Path
from utils.request_api import get_available_models


@st.dialog("Login")
def login():
    username = st.text_input("Username")
    password = st.text_input("Password", type="password")
    if st.button("Submit", disabled=True):
        st.session_state["logged_in"]  = True
        try:
            save_persistent_state()
        except Exception:
            pass
        st.rerun()
    # currently not available
    st.warning("Unavailable in this demo version.")

def logout():
    st.session_state["logged_in"] = False
    try:
        save_persistent_state()
    except Exception:
        pass


def render_topbar():
    col1, col2, col3, col4 = st.columns([1, 2, 6, 1])
    # first-time backend availability check
    if "checked_backend" not in st.session_state:
        st.session_state["checked_backend"] = False
    if not st.session_state["checked_backend"]:
        try:
            # try a fast GET to backend root
            backend_endpoint = st.session_state.get("backend_endpoint")
            models = get_available_models(backend_endpoint)
            model_id_list = [f"{m['model_provider']}/{m['model_name']}" for m in models]
            st.session_state["available_models"] = model_id_list
            backend_ok = True
            if len(model_id_list) == 0:
                backend_ok = False
        except Exception:
            backend_ok = False
        if not backend_ok:
            st.warning("Backend not reachable. Please check your settings.")
            # open settings dialog so user can update `frontend/config.py`
            settings()
        st.session_state["checked_backend"] = True
    with col1:
        if st.button("", icon=":material/settings:", use_container_width=False):
            settings()

    available_models = st.session_state.get("available_models", [])
    if st.session_state["llm_type"] in available_models:
        index = available_models.index(st.session_state["llm_type"])
    else:
        index = 0

    with col2:
        # st.button("GenMentor")
        llm_label = st.selectbox(
            "LLM Type",
            available_models,
            index=index,
            label_visibility="collapsed",
        )
        if len(available_models) > 0 and llm_label != st.session_state["llm_type"]:
            st.session_state["llm_type"] = llm_label
            try:
                save_persistent_state()
            except Exception:
                pass

    with col4:
        if st.session_state["logged_in"]:
            with st.popover("", icon=":material/account_circle:", use_container_width=True):
                logout_button = st.button("Log-out", icon=":material/exit_to_app:")
                if logout_button:
                    logout()
                    st.rerun()
        else:
            if st.button("", icon=":material/account_circle:", use_container_width=True):
                login()


@st.dialog("Settings")
def settings():
    """Settings dialog to edit backend endpoint and LLM API key stored in frontend/config.py

    This writes updates back to the `frontend/config.py` file and triggers a rerun.
    """
    # current backend endpoint
    is_valid_backend = False
    if_check_api = False
    cur_backend = getattr(config, "backend_endpoint", "http://127.0.0.1:5006/")
    new_backend = st.text_input("Backend endpoint (include protocol and port)", value=cur_backend)

    st.markdown("---")

    col1, col3  = st.columns([2, 1])
    with col3:
        if st.button("Check & Save", type="primary", use_container_width=True):
            if_check_api = True
            # normalize backend
            if not new_backend.endswith("/"):
                new_backend = new_backend + "/"

    if if_check_api:
        try:
            models = get_available_models(new_backend)
            model_id_list = [f"{m['model_provider']}/{m['model_name']}" for m in models]
            if len(model_id_list) > 0:
                is_valid_backend = True
            else:
                is_valid_backend = False
        except Exception as e:
            is_valid_backend = False
        if_check_api = False

    if is_valid_backend:
        st.session_state["backend_endpoint"] = new_backend
        st.session_state["available_models"] = model_id_list
        try:
            save_persistent_state()
            st.success("Settings saved. Restarting app...")
            st.rerun()
        except Exception as e:
            st.error(f"Failed to save settings: {e}")

    if not is_valid_backend:
        st.warning("Backend endpoint not reachable or invalid.")
        st.info("Ensure the GenMentor backend API is running and the endpoint is correct, including protocol and port (e.g., http://127.0.0.1:5000/).")
        st.info("Please refer to the [GenMentor Backend Setup Instructions](https://github.com/GeminiLight/gen-mentor/blob/main/backend/README.md) for more details on how to set up and run the backend service.")
