import time
import streamlit as st

from pages.knowledge_document import update_learner_feedback_with_feedback

from utils.state import get_current_session_uid

def render_session_completion(goal, selected_sid):
    if st.button("Complete Session", 
                    key="complete-session", type="primary", icon=":material/task_alt:", 
                    on_click=update_learner_feedback_with_feedback, kwargs={"feedback_data": "", "goal": goal},
                    use_container_width=True):
        # st.toast("🎉 Session completed successfully!")
        goal["learning_path"][selected_sid]["if_learned"] = True
        st.session_state["selected_page"] = "Learning Path"
        st.session_state["session_learning_times"][get_current_session_uid()]["end_time"] = time.time()
        st.switch_page("pages/learning_path.py")