
import time
import streamlit as st
from utils.state import get_current_session_uid


def track_session_learning_start_time():
    session_uid = get_current_session_uid()
    if st.session_state["session_learning_times"].get(session_uid, None) is None:
        st.session_state["session_learning_times"][session_uid] = {}
    session_learning_start_time = time.time()
    st.session_state["session_learning_times"][session_uid]["start_time"] = session_learning_start_time
    st.session_state["session_learning_times"][session_uid]["trigger_time_list"] = [session_learning_start_time]
