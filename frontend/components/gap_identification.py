import streamlit as st

from utils.request_api import create_learner_profile, identify_skill_gap
from utils.state import save_persistent_state

def render_identifying_skill_gap(goal):
    with st.spinner('Identifying Skill Gap ...'):
        learning_goal = goal["learning_goal"]
        learner_information = st.session_state["learner_information"]
        llm_type = st.session_state["llm_type"]
        skill_gaps = identify_skill_gap(learning_goal, learner_information, llm_type)
    goal["skill_gaps"] = skill_gaps
    save_persistent_state()
    st.rerun()
    st.toast("🎉 Successfully identify skill gaps!")
    return skill_gaps


def render_identified_skill_gap(goal, method_name="genmentor"):
    """
    Render skill gaps in a card-style with prev/next switching.
    """
    levels = ["unlearned", "beginner", "intermediate", "advanced"]
    # Render all skill cards on a single page (no pagination)
    skill_gaps = goal.get("skill_gaps", [])
    total = len(skill_gaps)
    if total == 0:
        st.info("No skills identified yet.")
        return

    for skill_id, skill_info in enumerate(skill_gaps):
        skill_name = skill_info.get("name", f"skill_{skill_id}")
        required_level = skill_info.get("required_level", levels[0])
        current_level = skill_info.get("current_level", levels[0])

        background_color = "#ffe6e6" if skill_info.get("is_gap") else "#e6ffe6"
        text_color = "#ff4d4d" if skill_info.get("is_gap") else "#33cc33"

        with st.container(border=True):
            # Card header
            st.markdown(
                f"""
                <div style="background-color: {background_color}; color: {text_color}; padding: 10px 16px; border-radius: 8px; margin-bottom: 12px; display: flex; align-items: center; min-height: 44px;">
                    <p style="font-weight: 700; margin: 0; flex: 1;">{skill_id+1:2d}. {skill_name}</p>
                </div>
                """,
                unsafe_allow_html=True,
            )

            # Required level selector
            new_required_level = st.pills(
                "**Required Level**",
                options=levels,
                selection_mode="single",
                default=required_level,
                disabled=False,
                key=f"required_{skill_name}_{method_name}",
            )
            if new_required_level != required_level:
                goal["skill_gaps"][skill_id]["required_level"] = new_required_level
                if levels.index(new_required_level) > levels.index(goal["skill_gaps"][skill_id].get("current_level", levels[0])):
                    goal["skill_gaps"][skill_id]["is_gap"] = True
                else:
                    goal["skill_gaps"][skill_id]["is_gap"] = False
                save_persistent_state()
                st.rerun()

            # Current level selector
            new_current_level = st.pills(
                "**Current Level**",
                options=levels,
                selection_mode="single",
                default=current_level,
                disabled=False,
                key=f"current_{skill_name}__{method_name}",
            )
            if new_current_level != current_level:
                goal["skill_gaps"][skill_id]["current_level"] = new_current_level
                if levels.index(new_current_level) < levels.index(goal["skill_gaps"][skill_id].get("required_level", levels[0])):
                    goal["skill_gaps"][skill_id]["is_gap"] = True
                else:
                    goal["skill_gaps"][skill_id]["is_gap"] = False
                save_persistent_state()
                st.rerun()

            # Details
            with st.expander("More Analysis Details"):
                if levels.index(goal["skill_gaps"][skill_id].get("current_level", levels[0])) < levels.index(goal["skill_gaps"][skill_id].get("required_level", levels[0])):
                    st.warning("Current level is lower than the required level!")
                    goal["skill_gaps"][skill_id]["is_gap"] = True
                else:
                    st.success("Current level is equal to or higher than the required")
                    goal["skill_gaps"][skill_id]["is_gap"] = False
                st.write(f"**Reason**: {skill_info.get('reason', '')}")
                st.write(f"**Confidence Level**: {skill_info.get('level_confidence', '')}")
            save_persistent_state()
            # Gap toggle
            old_gap_status = skill_info.get("is_gap", False)
            gap_status = st.toggle(
                "Mark as Gap",
                value=skill_info.get("is_gap", False),
                key=f"gap_{skill_name}_{method_name}",
                disabled=not skill_info.get("is_gap", False),
            )
            if gap_status != old_gap_status:
                goal["skill_gaps"][skill_id]["is_gap"] = gap_status
                if not goal["skill_gaps"][skill_id]["is_gap"]:
                    goal["skill_gaps"][skill_id]["current_level"] = goal["skill_gaps"][skill_id].get("required_level", goal["skill_gaps"][skill_id].get("current_level"))
                try:
                    save_persistent_state()
                except Exception:
                    pass
                st.rerun()

