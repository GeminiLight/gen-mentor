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

        refined = refine_learning_goal(
            goal["learning_goal"],
            st.session_state["learner_information"],
            st.session_state["llm_type"],
        )
        st.session_state["if_refining_learning_goal"] = False
        if refined is None:
            # Keep the user's original text rather than a placeholder.
            if hint_col is not None:
                hint_col.error("Could not refine the goal. Please try again.")
            return
        st.session_state["refined_learning_goal"] = refined
        goal["learning_goal"] = refined
        # goal_management renders its goal text_area with key "new_learning_goal";
        # without syncing the widget state, the rerun would hand back the
        # pre-refinement value and overwrite the refined goal.
        st.session_state["new_learning_goal"] = refined
        st.toast("✅ Refined Learning goal successfully.")
        save_persistent_state()
        st.rerun()
