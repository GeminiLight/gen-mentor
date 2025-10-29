import time
import math
import streamlit as st
from components.skill_info import render_skill_info
from utils.request_api import schedule_learning_path, reschedule_learning_path
from components.navigation import render_navigation
from utils.state import save_persistent_state

def render_learning_path():
    if not st.session_state.get("if_complete_onboarding"):
        st.switch_page("pages/onboarding.py")

    goal = st.session_state["goals"][st.session_state["selected_goal_id"]]
    save_persistent_state()
    if not goal["learning_goal"] or not st.session_state["learner_information"]:
        st.switch_page("pages/onboarding.py")
    else:
        if not goal["skill_gaps"]:
            st.switch_page("pages/skill_gap.py")

    st.title("Learning Path")
    st.write("Track your learning progress through the sessions below.")

    st.markdown("""
        <style>
        .card-header {
            color: #333;
            font-weight: bold;
            margin-bottom: 10px;
        }
        </style>
    """, unsafe_allow_html=True)
    if not goal["learning_path"]:
        with st.spinner('Scheduling Learning Path ...'):
            goal["learning_path"] = schedule_learning_path(goal["learner_profile"], session_count=8)
            save_persistent_state()
            st.toast("🎉 Successfully schedule learning path!")
            st.rerun()
        my_bar.empty()
    else:
        render_overall_information(goal)
        render_learning_sessions(goal)


def render_overall_information(goal):
    with st.container(border=True):
        st.write("#### 🎯 Current Goal")
        st.text_area("In-progress Goal", value=goal["learning_goal"], disabled=True, help="Change this in the Goal Management section.")
        learned_sessions = sum(1 for s in goal["learning_path"] if s["if_learned"])
        total_sessions = len(goal["learning_path"])
        if total_sessions == 0:
            st.warning("No learning sessions found.")
            progress = 0
        else:
            progress = int((learned_sessions / total_sessions) * 100)
        st.write("#### 📊 Overall Progress")
        with st.container():
            st.progress(progress)
            st.write(f"{learned_sessions}/{total_sessions} sessions completed ({progress}%)")

            if learned_sessions == total_sessions:
                st.success("🎉 Congratulations! All sessions are complete.")
                st.balloons()
            else:
                st.info("🚀 Keep going! You’re making great progress.")
        with st.expander("View Skill Details", expanded=False):
            render_skill_info(goal["learner_profile"])

def render_learning_sessions(goal):
    st.write("#### 📖 Learning Sessions")
    total_sessions = len(goal["learning_path"])
    with st.expander("Re-schedule Learning Path", expanded=False):
        st.info("Customize your learning path by re-scheduling sessions or marking them as complete.")
        expected_session_count = st.number_input("Expected Sessions", min_value=0, max_value=10, value=total_sessions)
        st.session_state["expected_session_count"] = expected_session_count
        try:
            save_persistent_state()
        except Exception:
            pass
        if st.button("Re-schedule Learning Path", type="primary"):
            st.session_state["if_rescheduling_learning_path"] = True
            try:
                save_persistent_state()
            except Exception:
                pass
            st.rerun()
        if st.session_state.get("if_rescheduling_learning_path"):
            with st.spinner('Re-scheduling Learning Path ...'):
                goal["learning_path"] = reschedule_learning_path(goal["learning_path"], goal["learner_profile"], expected_session_count)
                st.session_state["if_rescheduling_learning_path"] = False
                try:
                    save_persistent_state()
                except Exception:
                    pass
                st.toast("🎉 Successfully re-schedule learning path!")
                st.rerun()
    save_persistent_state()
    columns_spec = 2
    num_columns = math.ceil(len(goal["learning_path"]) / columns_spec)  
    columns_list = [st.columns(columns_spec, gap="large") for _ in range(num_columns)]
    for sid, session in enumerate(goal["learning_path"]):
        session_column = columns_list[sid // columns_spec]
        with session_column[sid % columns_spec]:
            with st.container(border=True):
                text_color = "#5ecc6b" if session["if_learned"] else "#fc7474"

                st.markdown(f"<div class='card'><div class='card-header' style='color: {text_color};'>{sid+1}: {session['title']}</div>", unsafe_allow_html=True)

                with st.expander("View Session Details", expanded=False):
                    st.info(session["abstract"])
                    st.write("**Associated Skills & Desired Proficiency:**")
                    for skill_outcome in session["desired_outcome_when_completed"]:
                        st.write(f"- {skill_outcome['name']} (`{skill_outcome['level']}`)")

                col1, col2 = st.columns([5, 3])
                with col1:
                    if_learned_key = f"if_learned_{session['id']}"
                    old_if_learned = session["if_learned"]
                    session_status_hint = "Keep Learning" if not session["if_learned"] else "Completed"
                    session_if_learned = st.toggle(session_status_hint, value=session["if_learned"], key=if_learned_key, disabled=True)
                    goal["learning_path"][sid]["if_learned"] = session_if_learned
                    save_persistent_state()
                    if session_if_learned != old_if_learned:
                        st.rerun()

                with col2:
                    if not session["if_learned"]:
                        start_key = f"start_{session['id']}_{session['if_learned']}"
                        if st.button("Learning", key=start_key, use_container_width=True, type="primary", icon=":material/local_library:"):
                            st.session_state["selected_session_id"] = sid
                            st.session_state["selected_point_id"] = 0
                            st.session_state["selected_page"] = "Knowledge Document"
                            save_persistent_state()
                            st.switch_page("pages/knowledge_document.py")
                    else:
                        start_key = f"start_{session['id']}_{session['if_learned']}"
                        if st.button("Completed", key=start_key, use_container_width=True, type="secondary", icon=":material/done_outline:"):
                            st.session_state["selected_session_id"] = sid
                            st.session_state["selected_point_id"] = 0
                            st.session_state["selected_page"] = "Knowledge Document"
                            save_persistent_state()
                            st.switch_page("pages/knowledge_document.py")


render_learning_path()