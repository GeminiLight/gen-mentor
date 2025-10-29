ground_truth_profile_creator_system_prompt = """
You are tasked with creating a ground-truth learner profile based on the provided learner information. This profile will simulate an accurate representation of the learner’s goals, skills, preferences, and potential knowledge gaps. It will serve as the baseline for simulating learner behaviors in subsequent steps.

Generate a profile with the following components:
- **Cognitive Status**: Mastered skills, in-progress skills, and knowledge gaps relevant to the learner’s goals.
- **Learning Preferences**: Preferred content style (e.g., summaries or detailed explanations) and activity type (e.g., interactive exercises or reading).
- **Behavioral Patterns**: Expected engagement patterns, such as frequency of participation and session duration preferences.
"""

ground_truth_profile_creator_task_prompt = """
Generate a ground-truth learner profile based on the following learner information:

- **Learner Information**: {learner_information} (e.g., resume, current skills, preferences)
- **Learning Goal**: {learning_goal}
- **Skill Requirements**: {skill_requirements}

The skills in Skill Requirements should be categorized as mastered or in-progress into the learner's current status.
"""


learner_interaction_simulator_system_prompt = """
You are a learner behavior simulator for an Intelligent Tutoring System designed for goal-oriented learning. Based on a ground-truth learner profile, generate realistic behavior data across three categories: Performance Metrics, Time Tracking, and Learner Feedback. These behaviors should reflect the learner’s cognitive status, learning preferences, and behavioral patterns as defined in their profile.

**Behavior Categories**:
1. **Performance Metrics**: Tracks frequency of participation, scores of exercises, and task completion rate.
2. **Time Tracking**: Monitors session duration, type and number of activities engaged in, and average time per task.
3. **Learner Feedback**: Collects self-reported satisfaction, self-assessed mastery, goal alignment feedback, and perceived difficulty for each session.

**Output Format**:
{{
    "performance_metrics": {{
        "participation_frequency": "...",
        "exercise_scores": "...",
        "completion_rate": "..."
    }},
    "time_tracking": {{
        "session_duration": "...",
        "activity_participation": "...",
        "average_task_time": "..."
    }},
    "learner_feedback": {{
        "satisfaction": "...",
        "self_assessed_mastery": "...",
        "goal_alignment_feedback": "...",
        "difficulty_perception": "..."
    }}
}}
"""

learner_interaction_simulator_task_prompt = """
Using the provided ground-truth learner profile, simulate the learner's behavior during one session. Generate data logs that capture the learner's performance, time tracking, and feedback for this session, showing the evolution in learner behavior.

Inputs:
- **Before-Learning Ground-Truth Learner Profile**: {previous_ground_truth_profile}
- **Expected After-Learning Ground-Truth Learner Profile**: {progressed_ground_truth_profile}
- **Learning Session Details**: {session_information}

Please generate data logs in the following categories:

1. **Performance Metrics**:
   - Log key performance indicators, such as task completion rate, accuracy, and any improvement or difficulty with specific skills.
   - Include any milestones reached (e.g., moving an in-progress skill closer to mastery).

2. **Time Tracking**:
   - Record the start and end times for each activity within the session.
   - Note any breaks, session duration, and time allocation per activity type (e.g., reading, interactive exercises).

3. **Learner Feedback**:
   - Simulate feedback based on engagement level and activity experience, such as satisfaction with content style, difficulty encountered, or suggestions for future sessions.
   - If applicable, include motivational feedback or emotional responses (e.g., frustration, enthusiasm).

You may be do not fully reflect all the details of the ground-truth profile in the simulated interaction.
This output should provide a comprehensive snapshot of the learner's session experience and reflect how this session contributes to progressing their learner profile.
"""

ground_truth_profile_creator_task_prompt_progress = """
Simulate the learner's progression by updating the ground-truth profile based on recent session activities. Your goal is to reflect how each session contributes to the learner’s growth, including gradual adjustments in cognitive status, learning preferences, and behavioral patterns.

- **Current Ground-Truth Learner Profile**: {ground_truth_profile}
- **Session Information**: {session_information}

Follow these instructions for updating each component:

1. **Cognitive Status Update**:
    - **Mastered Skills**: If any skill shows significant improvement, consider moving it to the mastered skills list. Reflect the final proficiency level (e.g., from intermediate to advanced) based on observed session performance.
    - **In-Progress Skills**: For skills currently in progress, increase the progress percentage to reflect session efforts. Adjust the expected proficiency level if the learner shows unexpected improvement or struggles.
    - **Knowledge Gaps**: If the session reveals new areas where the learner lacks understanding, add these as knowledge gaps. Conversely, if they demonstrate mastery over prior gaps, mark those gaps as resolved.

2. **Learning Preferences Update**:
    - **Content Style**: Note any preferences indicated by learner interactions (e.g., spending more time on summaries vs. detailed explanations). Update the preferred content style to reflect this trend.
    - **Activity Type**: Based on session data, adjust preferences for activity types (e.g., increase preference for interactive exercises if frequently engaged, or reading if passive learning is predominant).

3. **Behavioral Patterns Update**:
    - **System Usage Frequency**: Adjust usage frequency based on recent session engagement (e.g., increase if the learner logs in more than usual). Consider external factors if there’s a recent decline or spike in engagement.
    - **Session Duration and Engagement**: Update average session duration based on recent trends. Record any high or low engagement tendencies, such as consistent completion of interactive tasks or dropping out of sessions prematurely.
    - **Motivational Triggers**: If the learner shows reduced activity, mark a motivational trigger as required. Similarly, if engagement is high, adjust triggers to be less frequent.

After each session, the profile should reflect a realistic progression that mimics how a learner’s knowledge, preferences, and engagement evolve over time.

**Output Format**:
{{
    "learner_profile": {{
        "learner_information": "Summary of the learner's information",
        "learning_goal": "Summary of the learner's information",
        "cognitive_status": {{
            "overall_progress": 60,
            "mastered_skills": [
                {{
                    "skill": "Skill Name",
                    "proficiency_level": "advanced (final actual proficiency level)"
                }}
            ],
            "in_progress_skills": [
                {{
                "skill": "Skill Name",
                "proficiency_level": "advanced (expected proficiency level)"
                "progress_percentage": 40,
                }}
            ]
        }},
        "learning_preferences": {{
            "content_style": "[Concise summaries or Detailed explanations]",
            "activity_type": "[Reading-based learning or Actively query or Interactive exercises]",
        }},
        "behavioral_patterns": {{
            "system_usage_frequency": "Average of 3 logins per week",
            "session_duration_engagement": "Sessions average 30 minutes; high engagement in interactive tasks",
            "motivational_triggers": "Triggered motivational message due to decreased login frequency last week"
        }},
    }}
}}
"""

