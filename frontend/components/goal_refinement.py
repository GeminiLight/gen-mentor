import streamlit as st
from utils.request_api import refine_learning_goal
from utils.state import save_persistent_state

def on_refine_click():
    st.session_state["if_refining_learning_goal"] = True
    save_persistent_state()

def render_goal_refinement(goal, button_col=None, hint_col=None):
    if button_col is None:
        button_col = st
    refine_button = button_col.button("✨ AI Refinement", type="secondary", use_container_width=True, on_click=on_refine_click, disabled=st.session_state["if_refining_learning_goal"], key="refine_button")
    if refine_button:
        st.session_state["if_refining_learning_goal"] = True
        st.rerun()
    if st.session_state["if_refining_learning_goal"]:
        if hint_col is not None:
            hint_col.write("**✨ Refining learning goal...**")

        st.session_state["refined_learning_goal"] = refine_learning_goal(
            goal["learning_goal"],
            st.session_state["learner_information"],
            st.session_state["llm_type"],
        )
        goal["learning_goal"] = st.session_state["refined_learning_goal"]
        st.toast("✅ Refined Learning goal successfully.")
        st.session_state["if_refining_learning_goal"] = False
        save_persistent_state()
        st.rerun()
        # return goal["refined_learning_goal"]
