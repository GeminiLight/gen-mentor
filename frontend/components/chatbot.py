import streamlit as st
from streamlit_float import *
from utils.request_api import chat_with_tutor
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
    learner_profile = goal["learner_profile"]

    messages = st.container(height=300)
    if prompt := st.chat_input("Ask me anything"):
        messages.chat_message("user").write(prompt)
        st.session_state["tutor_messages"].append({"role": "user", "content": prompt})
        response = chat_with_tutor(
            st.session_state["tutor_messages"][-20:], 
            learner_profile,
            st.session_state["llm_type"])
        messages.chat_message("assistant").write(response)
        st.session_state["tutor_messages"].append({"role": "assistant", "content": response})
        # messages.chat_message("assistant").write(f"Echo: {prompt}")

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