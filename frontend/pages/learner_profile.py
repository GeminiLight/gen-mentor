import math
import streamlit as st
from utils.request_api import create_learner_profile, update_learner_profile
from components.skill_info import render_skill_info
from components.navigation import render_navigation
from utils.pdf import extract_text_from_pdf
from streamlit_extras.tags import tagger_component 
from utils.state import save_persistent_state


def render_learner_profile():
    # Title and introduction
    goal = st.session_state["goals"][st.session_state["selected_goal_id"]]

    st.title("Learner Profile")
    st.write("An overview of the learner's background, goals, progress, preferences, and behavioral patterns.")
    if not goal["learner_profile"]:
        with st.spinner('Identifying Skill Gap ...'):
            st.info("Please complete the onboarding process to view the learner profile.")
    else:
        try:
            render_learner_profile_info(goal)
        except Exception as e:
            st.error("An error occurred while rendering the learner profile.")
            # re generate the learner profile
            with st.spinner("Re-prepare your profile ..."):
                learner_profile = create_learner_profile(goal["learning_goal"], st.session_state["learner_information"], goal["skill_gaps"], st.session_state["llm_type"])
            goal["learner_profile"] = learner_profile
            try:
                save_persistent_state()
            except Exception:
                pass
            st.rerun()

def render_learner_profile_info(goal):
    st.markdown("""
        <style>
        .section {
            background-color: #f8f9fa;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
        }
        .progress-indicator {
            color: #28a745;
            font-weight: bold;
        }
        .skill-in-progress {
            color: #ffc107;
        }
        .skill-required {
            color: #dc3545;
        }
        </style>
    """, unsafe_allow_html=True)
    learner_profile = goal["learner_profile"]
    with st.container(border=True):
        # Learner Information
        st.markdown("#### 👤 Learner Information")
        st.markdown(f"<div class='section'>{learner_profile['learner_information']}</div>", unsafe_allow_html=True)

        # Learning Goal
        st.markdown("#### 🎯 Learning Goal")
        st.markdown(f"<div class='section'>{learner_profile['learning_goal']}</div>", unsafe_allow_html=True)

    with st.container(border=True):
        render_cognitive_status(goal)
    with st.container(border=True):
        render_learning_preferences(goal)
    with st.container(border=True):
        render_behavioral_patterns(goal)

    render_additional_info_form(goal)


def render_cognitive_status(goal):
    learner_profile = goal["learner_profile"]
    # Cognitive Status
    st.markdown("#### 🧠 Cognitive Status")
    st.write("**Overall Progress:**")
    st.progress(learner_profile["cognitive_status"]["overall_progress"])
    st.markdown(f"<p class='progress-indicator'>{learner_profile['cognitive_status']['overall_progress']}% completed</p>", unsafe_allow_html=True)
    render_skill_info(learner_profile)

def render_learning_preferences(goal):
    learner_profile = goal["learner_profile"]
    st.markdown("#### 📚 Learning Preferences")
    st.write(f"**Content Style:** {learner_profile['learning_preferences']['content_style']}")
    st.write(f"**Preferred Activity Type:** {learner_profile['learning_preferences']['activity_type']}")
    st.write(f"**Additional Notes:**")
    st.info(learner_profile['learning_preferences']['additional_notes'])

def render_behavioral_patterns(goal):
    learner_profile = goal["learner_profile"]
    st.markdown("#### 📊 Behavioral Patterns")
    st.write(f"**System Usage Frequency:**")
    st.info(learner_profile['behavioral_patterns']['system_usage_frequency'])
    st.write(f"**Session Duration and Engagement:**")
    st.info(learner_profile['behavioral_patterns']['session_duration_engagement'])
    st.write(f"**Motivational Triggers:**")
    st.info(learner_profile['behavioral_patterns']['motivational_triggers'])
    st.write(f"**Additional Notes:**")
    st.info(learner_profile['behavioral_patterns']['additional_notes'])


def render_additional_info_form(goal):
    with st.form(key="additional_info_form"):
        st.markdown("#### Value Your Feedback")
        st.info("Help us improve your learning experience by providing your feedback below.")
        st.write("How much do you agree with the current profile?")
        agreement_star = st.feedback("stars", key="agreement_star")
        st.write("Do you have any suggestions or corrections?")
        suggestions = st.text_area("Provide your suggestions here.", label_visibility="collapsed")
        st.write("Do you have any additional information to add?")
        additional_info = st.text_area("Provide any additional information or feedback here.", label_visibility="collapsed")
        pdf_file = st.file_uploader("Upload a PDF with additional information (e.g., resume)", type="pdf")
        if pdf_file is not None:
            with st.spinner("Extracting text from PDF..."):
                additional_info_pdf = extract_text_from_pdf(pdf_file)
                st.toast("✅ PDF uploaded successfully.")
        else:
            additional_info_pdf = ""
        st.session_state["additional_info"] = {
            "agreement_star": agreement_star,
            "suggestions": suggestions,
            "additional_info": additional_info + additional_info_pdf
        }
        try:
            save_persistent_state()
        except Exception:
            pass
        submit_button = st.form_submit_button("Update Profile", on_click=update_learner_profile_with_additional_info, 
                                              kwargs={"goal": goal, "additional_info": additional_info, }, type="primary")
        
def update_learner_profile_with_additional_info(goal, additional_info):
    additional_info = st.session_state["additional_info"]
    new_learner_profile = update_learner_profile(goal["learner_profile"], additional_info)
    if new_learner_profile is not None:
        goal["learner_profile"] = new_learner_profile
        try:
            save_persistent_state()
        except Exception:
            pass
        st.toast("🎉 Successfully updated your profile!")
    else:
        st.toast("❌ Failed to update your profile. Please try again.")


render_learner_profile()