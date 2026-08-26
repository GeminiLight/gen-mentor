import streamlit as st

from components.goal_refinement import render_goal_refinement
from utils.request_api import create_learner_profile, identify_skill_gap
from components.gap_identification import render_identified_skill_gap, render_identifying_skill_gap
from utils.state import add_new_goal, change_selected_goal_id, index_goal_by_id, reset_to_add_goal, save_persistent_state
from components.skill_info import render_skill_info


def render_goal_management():
    st.title("Goal Management")
    st.write("Manage your learning goals: add new ones, edit or delete existing ones.")

    render_add_new_goal()
    st.divider()
    render_existing_goals()

def render_add_new_goal():
    if "if_refining_learning_goal" not in st.session_state:
        st.session_state["if_refining_learning_goal"] = False
        save_persistent_state()
    if "if_show_skill_gap_results_in_dialog" not in st.session_state:
        st.session_state["if_show_skill_gap_results_in_dialog"] = False
        save_persistent_state()

    to_add_goal = st.session_state["to_add_goal"]
    st.subheader("🎯 Add New Goal")
    new_learning_goal = st.text_area("Enter your new goal:", to_add_goal["learning_goal"], key="new_learning_goal")
    to_add_goal["learning_goal"] = new_learning_goal

    refine_col, clear_col, hint_col, add_col = st.columns([1, 1, 3, 1])

    render_goal_refinement(to_add_goal, refine_col, hint_col)
    if clear_col.button("Clear", key="clear_goal"):
        reset_to_add_goal()
        save_persistent_state()
        st.rerun()

    if add_col.button("Add Goal", type="primary", icon=":material/add:", use_container_width=True):
        if new_learning_goal:
            render_skill_gap_dialog()
        else:
            hint_col.warning("Please enter a goal before adding.")

    if st.session_state["if_show_skill_gap_results_in_dialog"]:
        render_skill_gap_dialog()



def render_existing_goals():
    st.subheader("📋 Existing Goals")
    goals = st.session_state["goals"]
    non_deleted_goals = [goal for goal in goals if not goal["is_deleted"]]

    for goal_id, goal in enumerate(non_deleted_goals):
        with st.container():
            col_left, col_right = st.columns([3, 1])
            col_left.write(f"#### Goal {goal_id + 1}")
            
            # Check if the current goal is the active goal
            is_active = st.session_state.get("selected_goal_id") == goal["id"]
            
            if is_active:
                col_right.button("Current Active Goal", type="primary", key=f"active_{goal['id']}", use_container_width=True)
            else:
                if col_right.button("Set as Active Goal", key=f"set_{goal['id']}", help="Mark this goal as your active learning goal."):
                    # change_selected_goal_id sets selected_goal_id itself and
                    # resets the per-session/point cursors; assigning the id
                    # directly first would make it an early-return no-op.
                    change_selected_goal_id(goal["id"])
                    save_persistent_state()
                    st.rerun()
            
            st.info(f"{goal['learning_goal']}")
            st.write(f"**Overall Progress:**")
            learner_profile = goal["learner_profile"] or {}
            overall_progress = (learner_profile.get("cognitive_status") or {}).get("overall_progress", 0)
            progress = st.slider("Progress", min_value=0, max_value=100, value=overall_progress, key=f"progress_{goal['id']}", disabled=True)
            _cs = (learner_profile.get("cognitive_status") or {})
            unlearned_skill = len(_cs.get('in_progress_skills', []))
            learned_skill = len(_cs.get('mastered_skills', []))
            all_skill = learned_skill + unlearned_skill
            col1, col2, col3 = st.columns([1, 1, 1])
            with col1:
                st.metric(label="Total Skill Count", value=all_skill, delta_color="off")
            with col2:
                st.metric(label="Mastered Skill Count", value=learned_skill, delta_color="off")
            with col3:
                st.metric(label="In-progress Skill Count", value=unlearned_skill, delta_color="off")
            with st.expander("Skill Info"):
                render_skill_info(goal["learner_profile"])
            
            col1, col2 = st.columns([7, 1])
            with col1:
                if st.button("Edit", key=f"edit_{goal['id']}"):
                    show_edit_goal_dialog(goal["id"])

            with col2:
                if st.button("Delete", key=f"delete_{goal['id']}", type="primary"):
                    goal_index = index_goal_by_id(goal["id"])
                    st.session_state.goals[goal_index]["is_deleted"] = True
                    # If the deleted goal was the active one, move the selection
                    # to the next remaining goal instead of tracking a ghost.
                    if st.session_state["selected_goal_id"] == goal["id"]:
                        remaining = [g for g in st.session_state.goals if not g["is_deleted"]]
                        if remaining:
                            change_selected_goal_id(remaining[0]["id"])
                        # else: no goals left; the app reverts to onboarding on
                        # the next render via the empty-goals guards.
                    save_persistent_state()
                    st.success("Goal deleted successfully!")
                    st.rerun()
        
        if goal_id < len(non_deleted_goals) - 1:
            st.divider()

            
            


@st.dialog("Edit Goal")
def show_edit_goal_dialog(goal_id: int):
    """Edit a goal's text inside a dialog — nested buttons on the main page can
    never save because the outer button's state is gone on the rerun."""
    goal_index = index_goal_by_id(goal_id)
    if goal_index is None:
        st.error("Goal not found.")
        return
    goal = st.session_state.goals[goal_index]
    edited_goal = st.text_area("Edit Goal", value=goal["learning_goal"])
    if st.button("Save", type="primary"):
        goal["learning_goal"] = edited_goal
        save_persistent_state()
        st.success("Goal updated successfully!")
        st.rerun()


@st.dialog("Skill Gap", width="large")
def render_skill_gap_dialog():
    to_add_goal = st.session_state["to_add_goal"]
    st.write("Review and confirm your skill gaps.")
    num_skills = len(to_add_goal["skill_gaps"])
    num_gaps = sum(1 for skill in to_add_goal["skill_gaps"] if skill["is_gap"])
    st.info(f"There are {num_skills} skills in total, with {num_gaps} skill gaps identified.")
    if not to_add_goal["skill_gaps"]:
        st.session_state["if_show_skill_gap_results_in_dialog"] = True
        save_persistent_state()
        render_identifying_skill_gap(to_add_goal)
    else:
        st.session_state["if_show_skill_gap_results_in_dialog"] = False
        save_persistent_state()
        render_identified_skill_gap(to_add_goal)
        if_schedule_learning_path_ready = to_add_goal["skill_gaps"]
        if st.button("Schedule Learning Path", type="primary", disabled=not if_schedule_learning_path_ready):
            if to_add_goal["skill_gaps"] and not to_add_goal["learner_profile"]:
                with st.spinner('Creating your profile ...'):
                    learner_profile = create_learner_profile(to_add_goal["learning_goal"], st.session_state["learner_information"], to_add_goal["skill_gaps"], st.session_state["llm_type"])
                    if learner_profile is None:
                        st.rerun()
                    to_add_goal["learner_profile"] = learner_profile
                    st.toast("🎉 Your profile has been created!")
            new_goal_id = add_new_goal(**to_add_goal)
            st.session_state["selected_goal_id"] = new_goal_id
            save_persistent_state()
            st.session_state["if_complete_onboarding"] = True
            save_persistent_state()
            st.session_state["selected_page"] = "Learning Path"
            save_persistent_state()
            st.switch_page("views/learning_path.py")



render_goal_management()