import logging
import time
from pathlib import Path

import streamlit as st
from streamlit.errors import StreamlitAPIException

from utils.state import initialize_session_state, save_persistent_state
from utils import data_store
from config import asset_path

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


initialize_session_state()
st.session_state.setdefault("_autosave_enabled", True)

from components.chatbot import render_chatbot

st.set_page_config(page_title="GenMentor", page_icon="🧠", layout="wide")
st.logo(asset_path("./assets/avatar.png"))
st.markdown('<style>' + Path(asset_path('./assets/css/main.css')).read_text(encoding="utf-8") + '</style>', unsafe_allow_html=True)

if st.session_state.get("if_complete_onboarding", False) and not st.session_state.get("_navigated_lp_once", False):
    st.session_state["_navigated_lp_once"] = True
    _switch_page("views/learning_path.py")

@st.dialog("Confirm Reset")
def show_reset_dialog():
    st.warning("All history will be cleared. Do you reset not?")
    st.divider()
    col_confirm, _space, col_cancel = st.columns([1, 2, 0.7])
    with col_confirm:
        if st.button("Confirm", type="primary"):
            # Stop autosaving first, so nothing recreates the server state we
            # are about to remove.
            st.session_state["_autosave_enabled"] = False
            user_id = str(st.session_state.get("userId", "TestUser"))
            if not data_store.reset_state(user_id):
                st.error("Could not clear saved data: the backend did not confirm the reset.")
            st.session_state.clear()
            # switch_page targets run without re-executing this script, so the
            # defaults must be rebuilt here or every downstream key
            # (llm_type, to_add_goal, ...) is missing on the onboarding page.
            initialize_session_state()
            # After clearing state, navigate to onboarding page explicitly
            if not _switch_page("views/onboarding.py"):
                st.rerun()
    with col_cancel:
        if st.button("Cancel"):
            # simply rerun to close the dialog without changes
            st.rerun()

if st.session_state["show_chatbot"]:
    render_chatbot()

if st.session_state["if_complete_onboarding"]:
    onboarding = st.Page("views/onboarding.py", title="Onboarding", icon=":material/how_to_reg:", default=False, url_path="onboarding")
    learning_path = st.Page("views/learning_path.py", title="Learning Path", icon=":material/route:", default=True, url_path="learning_path")
else:
    onboarding = st.Page("views/onboarding.py", title="Onboarding", icon=":material/how_to_reg:", default=True, url_path="onboarding")
    learning_path = st.Page("views/learning_path.py", title="Learning Path", icon=":material/route:", default=False, url_path="learning_path")
def _page(filename: str, title: str, icon: str) -> st.Page:
    return st.Page(f"views/{filename}", title=title, icon=icon, default=False,
                   url_path=filename.rsplit(".", 1)[0])

skill_gaps = _page("skill_gap.py", "Skill Gap", ":material/insights:")
knowledge_document = _page("knowledge_document.py", "Lesson Viewer", ":material/menu_book:")
learner_profile = _page("learner_profile.py", "My Profile", ":material/person:")
goal_management = _page("goal_management.py", "Goal Management", ":material/flag:")
dashboard = _page("dashboard.py", "Analytics Dashboard", ":material/monitoring:")
sources = _page("sources.py", "Knowledge Sources", ":material/library_books:")

if not st.session_state["if_complete_onboarding"]:
    # Setup flow: the sidebar is hidden; navigation is driven by page redirects.
    pg = st.navigation({"GenMentor": [onboarding, skill_gaps, learning_path]}, position="hidden", expanded=True)
else:
    # Flat list, as before: grouped sections render collapsible headers users
    # found disjointed. sources stays in (it regressed out of this dict once).
    pg = st.navigation(
        {"GenMentor": [goal_management, learning_path, knowledge_document,
                       learner_profile, sources, dashboard]},
        position="sidebar", expanded=True)
    with st.sidebar:
        st.divider()
        _, center, _ = st.columns(3)
        with center:
            if st.button("Reset", help="Archive and clear your saved progress (a backup is kept server-side)"):
                show_reset_dialog()
        st.caption("Your data lives on the GenMentor backend and follows your account.")
    # Look the goal up by its "id" field rather than list position: an older or
    # hand-edited data store can leave selected_goal_id out of range, which a
    # bare list index would turn into an app-wide crash.
    goals = st.session_state["goals"]
    goal = next((g for g in goals if g.get("id") == st.session_state["selected_goal_id"]), None)
    if goal is None and goals:
        goal = goals[0]
        st.session_state["selected_goal_id"] = goal.get("id", 0)
    if goal is not None:
        # Seed the snapshot clock once per goal; resetting it on every render would
        # make the interval check below unreachable.
        goal.setdefault('start_time', time.time())
        history = st.session_state['learned_skills_history'].setdefault(goal.get('id', 0), [])

        # A goal whose profile is still empty (e.g. created while the backend was
        # down) has no cognitive_status yet; treat it as zero skills rather than
        # crashing the whole app.
        cognitive_status = (goal.get('learner_profile') or {}).get('cognitive_status') or {}
        unlearned_skill = len(cognitive_status.get('in_progress_skills', []))
        learned_skill = len(cognitive_status.get('mastered_skills', []))
        all_skill = learned_skill + unlearned_skill

        if all_skill != 0:
            mastery_rate = learned_skill / all_skill
            # Entries are {"ts", "rate"} — real timestamps persisted in the
            # mastery_history table (the dashboard plots against them).
            if not history:
                history.append({"ts": time.time(), "rate": mastery_rate})
            elif time.time() - goal['start_time'] > MASTERY_SNAPSHOT_INTERVAL:
                goal['start_time'] = time.time()
                history.append({"ts": time.time(), "rate": mastery_rate})

        if len(history) > MASTERY_HISTORY_LENGTH:
            del history[:-MASTERY_HISTORY_LENGTH]

_autosave()

pg.run()
