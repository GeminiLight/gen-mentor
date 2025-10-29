import math
import streamlit as st


def render_skill_info(learner_profile):
    # Display Mastered Skills
    st.write("**Mastered Skills:**")
    # len(learner_profile["cognitive_status"]["mastered_skills"])
    columns_spec = 2
    num_columns = math.ceil(len(learner_profile["cognitive_status"]["mastered_skills"]) / columns_spec)
    columns_list = [st.columns(spec=columns_spec) for _ in range(num_columns)]
    for idx, skill in enumerate(learner_profile["cognitive_status"]["mastered_skills"]):
        mastered_cols = columns_list[idx // columns_spec]
        with mastered_cols[idx % columns_spec]:
            st.markdown(
                f"<div style='background-color: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin-bottom: 10px'>"
                f"<strong>{skill['name']}</strong><br>"
                f"{skill['proficiency_level'].capitalize()}"
                f"</div>",
                unsafe_allow_html=True
            )

    # Skills In Progress with custom indicators
    st.write("**Skills In Progress:**")
    in_progress_skills = learner_profile["cognitive_status"]["in_progress_skills"]
    num_columns = math.ceil(len(in_progress_skills) / columns_spec)
    columns_list = [st.columns(spec=columns_spec) for _ in range(num_columns)]
    for idx, skill in enumerate(in_progress_skills):
        skill_name = skill["name"]
        required_level = skill["required_proficiency_level"]
        current_level = skill["current_proficiency_level"]
        in_progress_cols = columns_list[idx // columns_spec]
        with in_progress_cols[idx % columns_spec]:
            # Render each skill in a styled box
            levels = ["unlearned", "beginner", "intermediate", "advanced"]
            st.markdown(
                f"""
                <div style='background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #f5c6cb;'>
                    <strong>{skill_name}</strong><br>
                    <span>Required Level: <strong>{required_level.capitalize()}</strong></span><br>
                    <span>Current Level: <strong>{current_level.capitalize()}</strong></span><br>
                </div>
                """,
                unsafe_allow_html=True
            )
