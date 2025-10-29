import time
import json
import httpx
import streamlit as st

from components.topbar import render_topbar
from config import backend_endpoint, use_mock_data
from components.gap_identification import render_identifying_skill_gap, render_identified_skill_gap
from utils.state import add_new_goal, reset_to_add_goal, save_persistent_state
from utils.request_api import identify_skill_gap, create_learner_profile


def render_skill_gap():
    goal = st.session_state["to_add_goal"]
    if not goal["learning_goal"] or not st.session_state["learner_information"]:
        st.switch_page("pages/onboarding.py")

    left, center, right = st.columns([1, 5, 1])
    with center:
        # render_topbar()
        st.title("Skill Gap")
        st.write("Review and confirm your skill gaps.")

        if not goal["skill_gaps"]:
            render_identifying_skill_gap(goal)
        else:
            num_skills = len(goal["skill_gaps"])
            num_gaps = sum(1 for skill in goal["skill_gaps"] if skill["is_gap"])
            st.info(f"There are {num_skills} skills in total, with {num_gaps} skill gaps identified.")
            render_identified_skill_gap(goal)
            
            if_schedule_learning_path_ready = goal["skill_gaps"]
            space_col, continue_button_col = st.columns([1, 0.27])
            with continue_button_col:
                if st.button("Schedule Learning Path", type="primary", disabled=not if_schedule_learning_path_ready):
                    if goal["skill_gaps"] and not goal["learner_profile"]:
                        with st.spinner('Creating your profile ...'):
                            learner_profile = create_learner_profile(goal["learning_goal"], st.session_state["learner_information"], goal["skill_gaps"])
                            if learner_profile is None:
                                st.rerun()
                            goal["learner_profile"] = learner_profile
                            st.toast("🎉 Your profile has been created!")
                    new_goal_id = add_new_goal(**goal)
                    st.session_state["selected_goal_id"] = new_goal_id
                    st.session_state["if_complete_onboarding"] = True
                    st.session_state["selected_page"] = "Learning Path"
                    save_persistent_state()
                    st.switch_page("pages/learning_path.py")

render_skill_gap()