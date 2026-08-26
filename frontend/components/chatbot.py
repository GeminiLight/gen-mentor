import streamlit as st
from streamlit_float import *
from utils.request_api import chat_with_tutor_stream
from utils.state import index_goal_by_id


@st.dialog("🤖 Ask Tutor")
def ask_autor_chatbot():
    instruction = "👋 Hi! I'm your personal Tutor for goal-oriented learning 🎯. How can I help you achieve your learning goals today? "
    # messages.chat_message("user").write(prompt)
    st.info(instruction)
    
    if index_goal_by_id(st.session_state["selected_goal_id"]) == None:
        goal = st.session_state["to_add_goal"]
    else:
        goal = st.session_state["goals"][st.session_state["selected_goal_id"]]
    # The profile only exists once "Schedule Learning Path" has run; the tutor
    # works fine without one, so default instead of crashing the dialog.
    learner_profile = goal.get("learner_profile", "")

    messages = st.container(height=300)
    if prompt := st.chat_input("Ask me anything"):
        messages.chat_message("user").write(prompt)
        st.session_state["tutor_messages"].append({"role": "user", "content": prompt})
        # goal_id: retrieval also draws on this goal's pinned knowledge base
        goal_id = goal.get("id") if isinstance(goal, dict) else None
        with messages.chat_message("assistant"):
            # The stream client renders its own error and yields nothing on
            # failure, so an empty reply here means "show fallback".
            stream = chat_with_tutor_stream(
                st.session_state["tutor_messages"][-20:],
                learner_profile,
                st.session_state["llm_type"],
                goal_id=goal_id,
            )
            reply = st.write_stream(stream)
        if not reply:
            # Stream failed (message already shown); drop the user turn so the
            # persisted history stays well-formed for the next attempt.
            st.session_state["tutor_messages"].pop()
        else:
            st.session_state["tutor_messages"].append({"role": "assistant", "content": reply})

def click_chatbot_func():
    ask_autor_chatbot()


def render_chatbot():
    float_init()

    button_container = st.container()
    with button_container:
        if_open_chatbot = st.button("Ask Autor ", type="primary", key="chatbot", icon="🤖", on_click=click_chatbot_func)
        if if_open_chatbot:
            st.session_state.show_chatbot = True

    button_css = float_css_helper(width="8rem", right="2rem", bottom="4rem", transition=0)
    button_container.float(button_css)