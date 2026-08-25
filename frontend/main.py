import logging
import shutil
import time
from datetime import datetime
from pathlib import Path

import streamlit as st
from streamlit.errors import StreamlitAPIException

from utils.state import initialize_session_state, change_selected_goal_id, save_persistent_state, load_persistent_state, _get_data_store_path

logger = logging.getLogger(__name__)

# One history entry is plotted every 10 minutes on the dashboard, and we keep at
# most 10 entries (a rolling ~100 minute window).
MASTERY_SNAPSHOT_INTERVAL = 600
MASTERY_HISTORY_LENGTH = 10


def _autosave() -> None:
    """Persist session state, surfacing failures instead of silently dropping them."""
    if not st.session_state.get("_autosave_enabled", True):
        return
    try:
        save_persistent_state()
    except Exception as exc:
        logger.warning("Failed to persist session state: %s", exc, exc_info=True)
        st.toast(f"Could not save progress: {exc}", icon="⚠️")


def _switch_page(page: str) -> bool:
    """Navigate to `page`, returning False if Streamlit rejected the target.

    Streamlit implements navigation by raising a control-flow exception, so those
    must propagate. Only a bad page reference (StreamlitAPIException) is caught,
    and it is logged rather than discarded.
    """
    try:
        st.switch_page(page)
    except StreamlitAPIException as exc:
        logger.debug("Could not switch to page %r: %s", page, exc, exc_info=True)
        return False
    return True


def _reset_data_store(path: Path) -> None:
    """Archive the data store under a timestamped name, then delete it.

    The archive is written first on purpose: if it cannot be created the store is
    left in place rather than destroyed without a backup.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        return
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copy2(str(path), str(path.parent / f"data_storage-{ts}.json"))
    path.unlink()


initialize_session_state()
st.session_state.setdefault("_autosave_enabled", True)

from components.chatbot import render_chatbot

st.set_page_config(page_title="GenMentor", page_icon="🧠", layout="wide")
st.logo("./assets/avatar.png")
st.markdown('<style>' + open('./assets/css/main.css').read() + '</style>', unsafe_allow_html=True)

if st.session_state.get("if_complete_onboarding", False) and not st.session_state.get("_navigated_lp_once", False):
    st.session_state["_navigated_lp_once"] = True
    _switch_page("pages/learning_path.py")

@st.dialog("Confirm Reset")
def show_reset_dialog():
    st.warning("All history will be cleared. Do you reset not?")
    st.divider()
    col_confirm, _space, col_cancel = st.columns([1, 2, 0.7])
    with col_confirm:
        if st.button("Confirm", type="primary"):
            # Stop autosaving first, so nothing recreates the store we are about to remove.
            st.session_state["_autosave_enabled"] = False
            data_path = _get_data_store_path()
            try:
                _reset_data_store(data_path)
            except OSError as exc:
                logger.error("Failed to reset data store at %s: %s", data_path, exc, exc_info=True)
                st.error(f"Could not clear saved data: {exc}")
            st.session_state.clear()
            # After clearing state, navigate to onboarding page explicitly
            if not _switch_page("pages/onboarding.py"):
                st.rerun()
    with col_cancel:
        if st.button("Cancel"):
            # simply rerun to close the dialog without changes
            st.rerun()

if st.session_state["show_chatbot"]:
    render_chatbot()

if st.session_state["if_complete_onboarding"]:
    onboarding = st.Page("pages/onboarding.py", title="Onboarding", icon=":material/how_to_reg:", default=False, url_path="onboarding")
    learning_path = st.Page("pages/learning_path.py", title="Learning Path", icon=":material/route:", default=True, url_path="learning_path")
else:
    onboarding = st.Page("pages/onboarding.py", title="Onboarding", icon=":material/how_to_reg:", default=True, url_path="onboarding")
    learning_path = st.Page("pages/learning_path.py", title="Learning Path", icon=":material/route:", default=False, url_path="learning_path")
skill_gaps = st.Page("pages/skill_gap.py", title="Skill Gap", icon=":material/insights:", default=False, url_path="skill_gap")
knowledge_document = st.Page("pages/knowledge_document.py", title="Resume Learning", icon=":material/menu_book:", default=False, url_path="knowledge_document")
learner_profile = st.Page("pages/learner_profile.py", title="My Profile", icon=":material/person:", default=False, url_path="learner_profile")
goal_management = st.Page("pages/goal_management.py", title="Goal Management", icon=":material/flag:", default=False, url_path="goal_management")
dashboard = st.Page("pages/dashboard.py", title="Analytics Dashboard", icon=":material/browse:", default=False, url_path="dashboard")

# Learning Analytics Dashboard
if not st.session_state["if_complete_onboarding"]:
    nav_position = "sidebar"
    pg = st.navigation({"GenMentor": [onboarding, skill_gaps, learning_path]}, position="hidden", expanded=True)
else:
    nav_position = "sidebar"
    pg = st.navigation({"GenMentor": [goal_management, learning_path, knowledge_document, learner_profile, dashboard]}, position=nav_position, expanded=True)
    with st.sidebar:
        _left, _center, _right = st.columns([2, 2, 2])
        with _center:
            if st.button("Reset", help="Clear local history (keeps timestamped backups)"):
                show_reset_dialog()
    goal = st.session_state["goals"][st.session_state["selected_goal_id"]]
    # Seed the snapshot clock once per goal; resetting it on every render would
    # make the interval check below unreachable.
    goal.setdefault('start_time', time.time())
    history = st.session_state['learned_skills_history'].setdefault(goal['id'], [])

    unlearned_skill = len(goal['learner_profile']['cognitive_status']['in_progress_skills'])
    learned_skill = len(goal['learner_profile']['cognitive_status']['mastered_skills'])
    all_skill = learned_skill + unlearned_skill

    if all_skill != 0:
        mastery_rate = learned_skill / all_skill
        if not history:
            history.append(mastery_rate)
        elif time.time() - goal['start_time'] > MASTERY_SNAPSHOT_INTERVAL:
            goal['start_time'] = time.time()
            history.append(mastery_rate)

    if len(history) > MASTERY_HISTORY_LENGTH:
        del history[:-MASTERY_HISTORY_LENGTH]

if len(st.session_state["goals"]) != 0:
    change_selected_goal_id(st.session_state["selected_goal_id"])

_autosave()

pg.run()
