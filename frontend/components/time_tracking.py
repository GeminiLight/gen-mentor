
import time
import streamlit as st
from utils.state import get_current_session_uid


def track_session_learning_start_time():
    session_uid = get_current_session_uid()
    if st.session_state["session_learning_times"].get(session_uid, None) is None:
        st.session_state["session_learning_times"][session_uid] = {}
    # Only seed on first sight: re-initialising on every rerun would reset the
    # clock (and wipe the trigger list) on each widget interaction, making the
    # dashboard show "time since last click" instead of session duration.
    if "start_time" not in st.session_state["session_learning_times"][session_uid]:
        now = time.time()
        st.session_state["session_learning_times"][session_uid]["start_time"] = now
        st.session_state["session_learning_times"][session_uid]["trigger_time_list"] = [now]
