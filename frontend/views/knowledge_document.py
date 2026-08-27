import json
import logging
import math
import time
import copy
import re
import streamlit as st
import streamlit.components.v1 as components
import urllib.parse as urlparse
from components.time_tracking import track_session_learning_start_time
from utils.request_api import draft_knowledge_points, explore_knowledge_points, generate_document_quizzes, integrate_learning_document, update_learner_profile
from utils.format import prepare_markdown_document
from utils.state import get_current_session_uid, save_persistent_state
from config import use_mock_data, use_search, asset_path
from assets.js.doc_reading import doc_reading_auto_scroll_js

logger = logging.getLogger(__name__)


st.markdown('<style>' + open(asset_path('./assets/css/main.css')).read() + '</style>', unsafe_allow_html=True)


def render_learning_content():
    if 'if_render_qizzes' not in st.session_state:
        st.session_state['if_render_qizzes'] = False
        save_persistent_state()

    goal = st.session_state["goals"][st.session_state["selected_goal_id"]]
    if not goal["learning_path"]:
        st.error("Learning path is still scheduling. Please visit this page later.")
        return

    render_session_details(goal)
    session_uid = get_current_session_uid()
    session_id = st.session_state["selected_session_id"]
    selected_gid = st.session_state["selected_goal_id"]
    is_document_available = st.session_state["document_caches"].get(session_uid, False)
    if not is_document_available and not st.session_state["if_updating_learner_profile"]:
        learning_content = render_content_preparation(goal)
        if learning_content is None:
            st.error("Failed to prepare knowledge content.")
            return
    else:
        track_session_learning_start_time()
        learning_content = st.session_state["document_caches"].get(session_uid)
        if not isinstance(learning_content, dict):
            # No cached content for this session (e.g. a stuck
            # if_updating_learner_profile flag): fall back to generating it.
            st.session_state["document_caches"].pop(session_uid, None)
            clear_quiz_results(session_uid)
            render_content_preparation(goal)
            return

        render_type = "by_section"
        document = learning_content["document"]
        if render_type == "by_section":
            render_document_content_by_section(document)
        else:
            render_document_content_by_document(document)

        if st.session_state['if_render_qizzes']:
            quiz_data = learning_content["quizzes"]
            render_questions(quiz_data)
            st.divider()
            selected_sid = st.session_state["selected_session_id"]
            complete_button_status = True if goal["learning_path"][st.session_state["selected_session_id"]]["if_learned"] else False
            if st.button("Regenerate", icon=":material/refresh:"):
                st.session_state["document_caches"].pop(session_uid)
                _clear_pipeline_state(session_uid)
                clear_quiz_results(session_uid)
                save_persistent_state()
                goal['learner_profile']['behavioral_patterns']['additional_notes'] += f"I have regenerated Session {selected_sid} content.\n"
                st.rerun()
            if st.button("Complete Session", 
                        key="complete-session", type="primary", icon=":material/task_alt:", 
                        use_container_width=True, disabled=complete_button_status or st.session_state["if_updating_learner_profile"]):
                st.session_state["if_updating_learner_profile"] = True
                save_persistent_state()
                st.rerun()

            st.divider()
            render_content_feedback_form(goal)
            render_motivataional_triggers()


def render_motivataional_triggers():
    curr_time = time.time()
    session_uid = get_current_session_uid()
    session_learning_times = st.session_state["session_learning_times"][session_uid]
    last_session_trigger_time = session_learning_times["trigger_time_list"][-1]
    last_session_trigger_time_index = len(session_learning_times["trigger_time_list"])
    trigger_interval = 60 * 3
    if curr_time - last_session_trigger_time > trigger_interval:
        if last_session_trigger_time_index % 2 == 0:
            st.toast("🌟 Stay hydrated and keep a healthy posture.")
        else:
            st.toast("🚀 Keep up the good work!")
        session_learning_times["trigger_time_list"].append(curr_time)

def render_session_details(goal):
    # The path can shrink after a reschedule or goal switch while the stored
    # cursor still points past its end; clamp instead of crashing.
    selected_sid = max(0, min(st.session_state["selected_session_id"], len(goal["learning_path"]) - 1))
    st.session_state["selected_session_id"] = selected_sid
    session_uid = get_current_session_uid()
    session_info = goal["learning_path"][selected_sid]

    col1, col2, col3, col4 = st.columns([1, 2, 1, 1])
    with col1:
        if st.button("Back", icon=":material/arrow_back:", key="back-learning-center"):
            st.session_state["selected_page"] = "Learning Path"
            st.session_state["current_page"][session_uid] = 0

            st.switch_page("views/learning_path.py")
            save_persistent_state()

    with col3:
        if st.button("Regenerate", icon=":material/refresh:", key="regenerate-content-top"):
            st.session_state["document_caches"].pop(session_uid)
            _clear_pipeline_state(session_uid)
            clear_quiz_results(session_uid)
            save_persistent_state()
            goal['learner_profile']['behavioral_patterns']['additional_notes'] += f"I have regenerated Session {selected_sid} content.\n"
            st.session_state["current_page"][session_uid] = 0
            st.rerun()

    with col4:
        complete_button_status = True if session_info["if_learned"] else False

        if st.button("Complete Session", 
                     key="complete-session-bottom", type="primary", icon=":material/task_alt:", 
                    #  on_click=update_learner_profile_with_feedback, kwargs={"feedback_data": "", "goal": goal, "session_information": session_info},
                     use_container_width=True, disabled=complete_button_status or st.session_state["if_updating_learner_profile"]):
            st.session_state["if_updating_learner_profile"] = True
            st.session_state["current_page"][session_uid] = 0
            save_persistent_state()
            st.rerun()

        if st.session_state.get("if_updating_learner_profile"):
            update_result = update_learner_profile_with_feedback(goal, "", session_info)
            st.session_state["if_updating_learner_profile"] = False
            save_persistent_state()
            if not update_result:
                st.toast("Failed to update learner profile. Please try again.")
                st.rerun()
            else:
                st.toast("🎉 Session completed successfully!")
                goal["learning_path"][selected_sid]["if_learned"] = True
                st.session_state["selected_page"] = "Learning Path"
                save_persistent_state()
                if get_current_session_uid() in st.session_state["session_learning_times"]:
                    curr_time = time.time()
                    st.session_state["session_learning_times"][get_current_session_uid()]["end_time"] = curr_time
                    
                save_persistent_state()
                st.switch_page("views/learning_path.py")

    st.write(f"# {session_info['id']}")
    st.write(f"# {session_info['title']}")

    with st.container(border=True):
        st.info(session_info["abstract"])
        associated_skills = session_info["associated_skills"]
        st.write("**Associated Skills:**")
        for i, skill_name in enumerate(associated_skills):
            st.write(f"- {skill_name}")

# ---------------------------------------------------------------------------
# Stage checkpointing (refresh-safe content generation)
# ---------------------------------------------------------------------------

PIPELINE_STAGE_KEYS = ("knowledge_points", "knowledge_drafts", "document_structure")
PIPELINE_TOTAL_STAGES = 4
PIPELINE_STAGE_LABELS = {
    "knowledge_points": "🔍 Knowledge points",
    "knowledge_drafts": "📝 Knowledge point drafts",
    "document_structure": "📚 Knowledge document",
}
PIPELINE_STAGE_RUNNING_LABELS = {
    "knowledge_points": "🔍 Exploring knowledge points…",
    "knowledge_drafts": "📝 Drafting knowledge points…",
    "document_structure": "📚 Integrating knowledge document…",
    "_quizzes": "🎯 Generating document quizzes…",
}


def pipeline_progress_snapshot(pipeline_state, document_cached=False):
    """Compute the progress read-out for an in-flight content pipeline.

    Pure helper (no Streamlit, no mutation of its arguments) so the fragment
    below can re-run it every few seconds against the latest checkpoint
    state. Returns ``None`` when there is nothing to show — no pipeline state
    for the session, or a cached document with nothing checkpointed — which
    makes a stale fragment fire a no-op. Otherwise::

        {"completed": 0-3, "in_flight_stage": 1-4, "total": 4,
         "restored_lines": [...], "status_line": str}

    ``restored_lines`` describe the checkpointed stages ("Stage 2/4 📝
    Knowledge point drafts ✓ restored"); ``status_line`` describes the stage
    the main script run is currently executing.
    """
    if pipeline_state is None:
        return None
    state = pipeline_state if isinstance(pipeline_state, dict) else {}
    restored = [
        (stage, key)
        for stage, key in enumerate(PIPELINE_STAGE_KEYS, start=1)
        if state.get(key) is not None
    ]
    if not restored and document_cached:
        return None
    restored_lines = [
        f"Stage {stage}/{PIPELINE_TOTAL_STAGES} {PIPELINE_STAGE_LABELS[key]} ✓ restored"
        for stage, key in restored
    ]
    in_flight_stage = min(len(restored) + 1, PIPELINE_TOTAL_STAGES)
    if in_flight_stage <= len(PIPELINE_STAGE_KEYS):
        running_label = PIPELINE_STAGE_RUNNING_LABELS[PIPELINE_STAGE_KEYS[in_flight_stage - 1]]
    else:
        running_label = PIPELINE_STAGE_RUNNING_LABELS["_quizzes"]
    return {
        "completed": len(restored),
        "in_flight_stage": in_flight_stage,
        "total": PIPELINE_TOTAL_STAGES,
        "restored_lines": restored_lines,
        "status_line": f"Stage {in_flight_stage}/{PIPELINE_TOTAL_STAGES} {running_label}",
    }


@st.fragment(run_every="5s")
def render_pipeline_progress(session_uid):
    """Auto-refreshing progress area for the content preparation pipeline.

    Display only: the heavy generation runs on the main script run (see
    ``render_content_preparation``) and checkpoints into session state, which
    this fragment re-reads every 5 seconds so an in-flight pipeline visibly
    advances without user interaction. When the completed document cache
    appears while the pipeline is still flagged as in flight, a full app
    rerun swaps the page over to the document view. A fire without pipeline
    state renders nothing.
    """
    document_cached = bool((st.session_state.get("document_caches") or {}).get(session_uid, False))
    pipeline_state = (st.session_state.get("content_pipeline_state") or {}).get(session_uid)
    snapshot = pipeline_progress_snapshot(pipeline_state, document_cached)
    if snapshot is None:
        return
    if document_cached:
        st.rerun(scope="app")
        return
    st.progress(snapshot["in_flight_stage"] / snapshot["total"])
    st.write(snapshot["status_line"])
    for line in snapshot["restored_lines"]:
        st.caption(line)


def next_pipeline_stage(pipeline_state):
    """The first stage whose checkpoint is missing, or None when all are done.

    A stage counts as done only when its checkpoint is present (failed stages
    are never written), so a rerun resumes right after the last success.
    """
    pipeline_state = pipeline_state or {}
    for stage_key in PIPELINE_STAGE_KEYS:
        if pipeline_state.get(stage_key) is None:
            return stage_key
    return None


def _checkpoint_pipeline_stage(session_uid, stage_key, value):
    st.session_state["content_pipeline_state"].setdefault(session_uid, {})[stage_key] = value
    save_persistent_state()


def _clear_pipeline_state(session_uid):
    st.session_state["content_pipeline_state"].pop(session_uid, None)
    save_persistent_state()


def render_content_preparation(goal):
    selected_sid = st.session_state["selected_session_id"]
    learning_session = goal["learning_path"][selected_sid]
    session_uid = get_current_session_uid()
    if use_mock_data:
        st.warning("Using mock data for knowledge document.")
        file_path = asset_path("./assets/data_example/knowledge_document.json")
        learning_content = load_knowledge_point_content(file_path)
        if learning_content is None:
            return None
        # Same contract as the live pipeline below: cache, persist, rerun. The
        # caller renders from document_caches on the next run, never from this
        # return value, so skipping the rerun leaves the page blank.
        st.session_state["document_caches"][session_uid] = learning_content
        _clear_pipeline_state(session_uid)
        save_persistent_state()
        st.rerun()
        return learning_content

    # A page refresh mid-pipeline reruns the whole script; resume from the last
    # checkpointed stage instead of restarting the pipeline from scratch.
    pipeline_state = st.session_state["content_pipeline_state"].setdefault(session_uid, {})

    # Progress read-out only: it refreshes itself every 5 seconds while the
    # stages below run on this main script run and checkpoint their results.
    render_pipeline_progress(session_uid)

    knowledge_points = None
    if next_pipeline_stage(pipeline_state) == "knowledge_points":
        with st.spinner("Stage 1/4 - Exploring knowledge Points..."):
            knowledge_points = explore_knowledge_points(
                goal["learner_profile"],
                goal["learning_path"],
                learning_session,
                llm_type=st.session_state["llm_type"]
            )
        if knowledge_points is None:
            st.error("Failed to explore knowledge points.")
            return
        _checkpoint_pipeline_stage(session_uid, "knowledge_points", knowledge_points)
        st.success("Stage 1/4 🔍 Knowledge points explored successfully.")
    else:
        # Restored stages are reported by render_pipeline_progress above.
        knowledge_points = pipeline_state["knowledge_points"]
    with st.expander("View Explored Knowledge Points", expanded=False):
        for kp in knowledge_points:
            st.write(f"- {kp['name']} (`{kp['type']}`)")
    knowledge_drafts = None
    if next_pipeline_stage(pipeline_state) == "knowledge_drafts":
        with st.spinner("Stage 2/4 - Drafting knowledge points..."):
            knowledge_drafts = draft_knowledge_points(
                goal["learner_profile"],
                goal["learning_path"],
                learning_session,
                knowledge_points,
                use_search=use_search,
                allow_parallel=True,
                llm_type=st.session_state["llm_type"],
                goal_id=goal.get("id")
            )
        if knowledge_drafts is None:
            st.error("Failed to draft knowledge points.")
            return
        _checkpoint_pipeline_stage(session_uid, "knowledge_drafts", knowledge_drafts)
        st.success("Stage 2/4 📝 Knowledge points drafted successfully.")
    else:
        knowledge_drafts = pipeline_state["knowledge_drafts"]
    document_structure = None
    if next_pipeline_stage(pipeline_state) == "document_structure":
        with st.spinner("Stage 3/4 - Integrating knowledge document..."):
            document_structure = integrate_learning_document(
                goal["learner_profile"],
                goal["learning_path"],
                learning_session,
                knowledge_points,
                knowledge_drafts,
                llm_type=st.session_state["llm_type"],
                output_markdown=False
            )
        if document_structure is None:
            st.error("Failed to integrate knowledge document.")
            return
        learning_document = prepare_markdown_document(document_structure, knowledge_points, knowledge_drafts)
        if learning_document is None:
            st.error("Failed to integrate knowledge document.")
            return
        _checkpoint_pipeline_stage(session_uid, "document_structure", document_structure)
        st.success("Stage 3/4 📚 Knowledge document integrated successfully.")
    else:
        document_structure = pipeline_state["document_structure"]
        learning_document = prepare_markdown_document(document_structure, knowledge_points, knowledge_drafts)
        if learning_document is None:
            st.error("Failed to integrate knowledge document.")
            return
    learning_content = {"document": learning_document}
    with st.spinner("Stage 4/4 - Generating document quizzes..."):
        quizzes = generate_document_quizzes(
            goal["learner_profile"],
            learning_document,
            single_choice_count=3,
            multiple_choice_count=1,
            true_false_count=1,
            short_answer_count=1,
            llm_type=st.session_state["llm_type"]
        )
    if quizzes is None:
        st.error("Failed to generate document quizzes.")
        return
    learning_content["quizzes"] = quizzes
    st.success("Stage 4/4 🎯 Document quizzes generated successfully.")
    st.session_state["document_caches"][session_uid] = learning_content
    # The full document is cached: drop the partial state so a later
    # Regenerate starts a fresh pipeline.
    _clear_pipeline_state(session_uid)
    save_persistent_state()
    st.rerun()
    return learning_content

SECTION_HEADER_RE = re.compile(r"^(#{2,6})\s", re.MULTILINE)


def split_document_into_sections(document: str) -> list[str]:
    """Split a markdown document into one section per H2 (``##``) header.

    Pure function (no Streamlit) so the paging logic is testable on its own.
    Boundaries are the actual header matches, not reconstructed positions: the
    previous ``find(title) - 3`` slicing assumed exactly ``"## "`` before the
    title and could match title words anywhere in the body, producing wrong
    slices. Every exactly-level-2 header starts a new section (deeper ``###``
    headers never do, matching the sidebar TOC's page counting); sections are
    trimmed and empty slices dropped. Anything before the first H2 (document
    title and overview) belongs to no section, as before — the session header
    rendered above already covers it. Any newline style works. A non-empty
    document always yields at least one page, so callers can index page 0 even
    when there is no H2 header at all (the old splitter returned [] there).
    """
    if not isinstance(document, str) or not document:
        return [""]
    starts = [
        match.start()
        for match in SECTION_HEADER_RE.finditer(document)
        if len(match.group(1)) == 2
    ]
    if not starts:
        trimmed = document.strip()
        return [trimmed] if trimmed else [""]
    bounds = starts + [len(document)]
    sections = [document[bounds[i]:bounds[i + 1]].strip() for i in range(len(starts))]
    sections = [section for section in sections if section]
    return sections or [document.strip()]


def render_document_content_by_section(document):
    selected_gid = st.session_state["selected_goal_id"]
    session_id = st.session_state["selected_session_id"]
    if "current_page" not in st.session_state or not isinstance(st.session_state["current_page"], dict):
        st.session_state["current_page"] = {}

    section_documents = split_document_into_sections(document)

    page_key = f"{selected_gid}-{session_id}"
    # st.query_params is dict-like and returns plain string values on every
    # supported Streamlit version; the deprecated experimental accessor
    # (removed after 2024-04-11) is no longer needed as a fallback.
    try:
        params = st.query_params.to_dict()
    except Exception:
        params = {}

    if 'gm_page' in params:
        # A hand-edited or stale ?gm_page= value is expected; ignore it.
        try:
            p = int(params['gm_page'])
        except (TypeError, ValueError):
            logger.debug("Ignoring non-numeric gm_page param: %r", params['gm_page'])
        else:
            st.session_state['current_page'][page_key] = max(0, min(p, len(section_documents) - 1))
            save_persistent_state()
    if 'gm_anchor' in params and params['gm_anchor']:
        try:
            st.session_state[f"{page_key}__pending_anchor_text"] = urlparse.unquote(params['gm_anchor'])
        except Exception:
            st.session_state[f"{page_key}__pending_anchor_text"] = params['gm_anchor']

    current_page = st.session_state['current_page'].get(page_key, 0)

    prev_page_key = f"{page_key}__prev"
    prev_page = st.session_state.get(prev_page_key, None)
    if prev_page is None or prev_page != current_page or st.session_state.get(f"{page_key}__pending_anchor_text"):
        pending_anchor_text = st.session_state.get(f"{page_key}__pending_anchor_text")
        pending_anchor_js = json.dumps(pending_anchor_text) if pending_anchor_text else 'null'
        components.html(doc_reading_auto_scroll_js.replace("PENDING_ANCHOR_PLACEHOLDER", pending_anchor_js),
            height=1,
        )
        st.session_state[prev_page_key] = current_page
        st.session_state[f"{page_key}__pending_anchor_text"] = None
        save_persistent_state()
    st.markdown(section_documents[current_page])

    st.sidebar.header("Document Structure")
    curr_l2 = 0
    curr_l3 = 0
    page_idx_counter = -1
    for m in re.finditer(r'^(#+)\s*(.+)$', document, re.MULTILINE):
        level_marks, title_txt = m.group(1), m.group(2).strip()
        level_len = len(level_marks)
        if level_len == 1:
            continue
        if level_len == 2:
            page_idx_counter += 1
            curr_l2 += 1
            curr_l3 = 0
            if st.sidebar.button(f"{curr_l2}. {title_txt}", key=f"toc_l2_{page_idx_counter}", type="primary" if page_idx_counter == current_page else "secondary"):
                st.session_state.setdefault("current_page", {})[page_key] = page_idx_counter
                st.rerun()
            st.sidebar.markdown("")

        elif level_len == 3 and page_idx_counter >= 0:
            curr_l3 += 1
            st.sidebar.markdown(f"&nbsp;&nbsp;&nbsp;[{curr_l2}.{curr_l3}. {title_txt}](#{title_txt.lower().replace(' ', '-').replace('，','').replace('。','')})", unsafe_allow_html=True)

    col_prev, col_center, col_next= st.columns([1, 4, 1])
    if current_page > 0:
        if col_prev.button("Previous Page", icon=":material/arrow_back:", use_container_width=True, key="prev-section-page"):
            new_page = current_page - 1
            st.session_state["current_page"][page_key] = new_page
            save_persistent_state()
            st.rerun()
    if current_page < len(section_documents) - 1:
        if col_next.button("Next Page", icon=":material/arrow_forward:", use_container_width=True, key="next-section-page"):
            new_page = current_page + 1
            st.session_state["current_page"][page_key] = new_page
            save_persistent_state()
            st.rerun()

    st.divider()

    if current_page == len(section_documents) - 1:
        st.session_state["if_render_qizzes"] = True
    else:
        st.session_state["if_render_qizzes"] = False

    

def render_document_content_by_document(document):
    st.session_state["if_render_qizzes"] = True

    titles = re.findall(r'^(#+)\s*(.*)', document, re.MULTILINE)

    sections = []
    for level, title in titles:
        section = {'level': len(level), 'title': title}
        sections.append(section)

    sidebar_content = ""
    curr_level_1_idx = 0
    curr_level_2_idx = 0
    curr_level_3_idx = 0
    for i, section in enumerate(sections):
        anchor = re.sub(r'[^\w\s]', '-', section["title"].lower()).replace(" ", "-")
        if section["level"] == 1:
            continue
        if section["level"] == 2:
            curr_level_2_idx += 1
            curr_level_3_idx = 0
            sidebar_content += f"[**{curr_level_2_idx}. {section['title']}**](#{anchor})\n"
        elif section["level"] == 3:
            curr_level_3_idx += 1
            sidebar_content += f"> [{curr_level_2_idx}.{curr_level_3_idx}. {section['title']}](#{anchor})\n\n"

    st.sidebar.header("Document Structure")
    st.sidebar.markdown(sidebar_content)

    st.markdown(document)

    for section in sections:
        anchor = section["title"].replace(" ", "").replace("，", "").replace("。", "")
        st.markdown(f"<a name='{anchor}'></a>", unsafe_allow_html=True)


def _resolve_correct_option(options, correct):
    """The backend types correct_option as int | str: an index, a letter, or
    the option text. Map whatever arrives onto the actual option string."""
    if isinstance(correct, int) and 0 <= correct < len(options):
        return options[correct]
    correct_str = str(correct).strip()
    letters = "ABCDEFGH"
    if len(correct_str) == 1 and correct_str.upper() in letters:
        idx = letters.index(correct_str.upper())
        if idx < len(options):
            return options[idx]
    if correct_str in options:
        return correct_str
    # int-like string index is the last reasonable interpretation
    try:
        idx = int(correct_str)
        if 0 <= idx < len(options):
            return options[idx]
    except ValueError:
        pass
    return None


# ---------------------------------------------------------------------------
# Quiz result accumulation (feeds the learner profile on session completion)
# ---------------------------------------------------------------------------

QUIZ_RESULT_TYPES = ("single_choice", "multiple_choice", "true_false", "short_answer")
QUIZ_RESULTS_KEY_PREFIX = "quiz_results_"
# All questions are judged together when "Submit Answers" is pressed, and a
# bare button click does not survive reruns, so the judged per-question
# verdicts are latched inside the stored results dict (private key, never
# sent as-is to the profiler).
SUBMITTED_ANSWERS_KEY = "_submitted_answers"
# Wrong questions accumulate per goal for later review. The in-session copy
# lives under QUIZ_REVIEW_LIST_KEY and is mirrored after every update into a
# quiz_results_review_{goal_id} key, which the persistence layer auto-picks
# (goal ids are normalised to strings because JSON round-trips do that to
# int dict keys anyway).
QUIZ_REVIEW_LIST_KEY = "quiz_review_list"
# (kind, quiz_data list key, widget key prefix) in question render order.
QUIZ_KIND_FIELDS = (
    ("single_choice", "single_choice_questions", "single_"),
    ("multiple_choice", "multiple_choice_questions", "multi_"),
    ("true_false", "true_false_questions", "tf_"),
    ("short_answer", "short_answer_questions", "short_"),
)


def quiz_results_state_key(session_uid):
    return f"{QUIZ_RESULTS_KEY_PREFIX}{session_uid}"


def quiz_review_state_key(goal_id):
    return f"{QUIZ_RESULTS_KEY_PREFIX}review_{goal_id}"


def new_quiz_results():
    results = {q_type: {"answered": 0, "correct": 0} for q_type in QUIZ_RESULT_TYPES}
    results["wrong_questions"] = []
    return results


def record_quiz_answer(results, question_type, is_correct=None, question=None, expected_answer=None):
    """Record one answered question into ``results`` in place.

    ``is_correct=None`` means the question has no reliable auto-scoring (short
    answers): it counts as answered only. ``is_correct=False`` also appends the
    question to ``wrong_questions`` for the profiler.
    """
    entry = results.setdefault(question_type, {"answered": 0, "correct": 0})
    entry["answered"] += 1
    if is_correct:
        entry["correct"] += 1
    elif is_correct is False:
        results.setdefault("wrong_questions", []).append({
            "question": question or "",
            "expected_answer": expected_answer,
        })
    return results


def summarize_quiz_results(results):
    """Flatten a stored quiz results dict into the aggregate payload fields."""
    results = results or {}
    total_answered = sum(int(results.get(q_type, {}).get("answered", 0)) for q_type in QUIZ_RESULT_TYPES)
    total_correct = sum(int(results.get(q_type, {}).get("correct", 0)) for q_type in QUIZ_RESULT_TYPES)
    accuracy = round(total_correct / total_answered, 2) if total_answered else 0.0
    return {
        "total_answered": total_answered,
        "total_correct": total_correct,
        "accuracy": accuracy,
        "wrong_questions": list(results.get("wrong_questions", [])),
    }


def build_quiz_performance(results, session_title=""):
    """The ``quiz_performance`` object merged into learner_interactions."""
    return {"session_title": session_title or "", **summarize_quiz_results(results)}


def merge_quiz_performance(feedback_data, quiz_performance):
    """Combine feedback form data and quiz performance into learner_interactions.

    ``feedback_data`` is "" in the Complete Session flow and a dict when the
    feedback form was submitted; existing content is always preserved.
    """
    payload = dict(feedback_data) if isinstance(feedback_data, dict) else {}
    if quiz_performance and quiz_performance.get("total_answered"):
        payload["quiz_performance"] = quiz_performance
    return payload


def _quiz_verdict(answered, display_correct):
    """The per-question verdict shown after Submit ("unanswered" when skipped)."""
    if not answered:
        return "unanswered"
    return "correct" if display_correct else "incorrect"


def format_expected_answer(expected):
    """Render an expected answer (option text, list of options, or text) inline."""
    if expected is None:
        return ""
    if isinstance(expected, (list, tuple)):
        return ", ".join(str(item) for item in expected)
    return str(expected)


def judge_quiz_submissions(quiz_data, selections):
    """Judge every question against the submitted selections in one pass.

    Pure helper (no Streamlit, no mutation of its arguments). ``selections``
    holds the widget values aligned with the question lists in ``quiz_data``:
    ``single_choice`` -> option text or None, ``multiple_choice`` -> list of
    checked option texts, ``true_false`` -> "True"/"False"/None,
    ``short_answer`` -> raw text.

    Returns ``(results, judgments)``: ``results`` is the quiz-results dict
    stored for the profile update (per-type counts + wrong_questions), and
    ``judgments`` maps each question's widget key to its verdict for
    rendering and review-list updates. Short answers have no reliable
    auto-scoring, so they count as answered only (``is_correct=None``) and
    never reach the review list; unanswered questions are not counted.
    """
    quiz_data = quiz_data or {}
    selections = selections or {}
    results = new_quiz_results()
    judgments = {}
    number = 0

    def pick(kind, index):
        values = selections.get(kind) or []
        return values[index] if index < len(values) else None

    for i, q in enumerate(quiz_data.get("single_choice_questions") or []):
        number += 1
        selected = pick("single_choice", i)
        correct_option = _resolve_correct_option(q["options"], q["correct_option"])
        expected = correct_option if correct_option is not None else q["correct_option"]
        answered = selected is not None
        is_correct = (selected == correct_option) if answered else None
        if answered:
            record_quiz_answer(results, "single_choice", is_correct,
                               question=q["question"], expected_answer=expected)
        judgments[f"single_{i}"] = {
            "number": number, "kind": "single_choice", "question": q["question"],
            "answered": answered, "is_correct": is_correct,
            "verdict": _quiz_verdict(answered, bool(is_correct)), "expected_answer": expected,
        }

    for i, q in enumerate(quiz_data.get("multiple_choice_questions") or []):
        number += 1
        selected = list(pick("multiple_choice", i) or [])
        correct_options = [c for c in (_resolve_correct_option(q["options"], idx) for idx in q["correct_options"]) if c is not None]
        answered = len(selected) > 0
        is_correct = (set(selected) == set(correct_options)) if answered else None
        if answered:
            record_quiz_answer(results, "multiple_choice", is_correct,
                               question=q["question"], expected_answer=correct_options)
        judgments[f"multi_{i}"] = {
            "number": number, "kind": "multiple_choice", "question": q["question"],
            "answered": answered, "is_correct": is_correct,
            "verdict": _quiz_verdict(answered, bool(is_correct)), "expected_answer": correct_options,
        }

    for i, q in enumerate(quiz_data.get("true_false_questions") or []):
        number += 1
        selected = pick("true_false", i)
        correct_answer = "True" if q["correct_answer"] else "False"
        answered = selected is not None
        is_correct = (selected == correct_answer) if answered else None
        if answered:
            record_quiz_answer(results, "true_false", is_correct,
                               question=q["question"], expected_answer=correct_answer)
        judgments[f"tf_{i}"] = {
            "number": number, "kind": "true_false", "question": q["question"],
            "answered": answered, "is_correct": is_correct,
            "verdict": _quiz_verdict(answered, bool(is_correct)), "expected_answer": correct_answer,
        }

    for i, q in enumerate(quiz_data.get("short_answer_questions") or []):
        number += 1
        user_answer = pick("short_answer", i) or ""
        expected = q.get("expected_answer") or ""
        answered = bool(user_answer.strip())
        display_correct = user_answer.strip().lower() == expected.strip().lower()
        if answered:
            record_quiz_answer(results, "short_answer", None)
        judgments[f"short_{i}"] = {
            "number": number, "kind": "short_answer", "question": q["question"],
            "answered": answered, "is_correct": None,
            "verdict": _quiz_verdict(answered, display_correct), "expected_answer": expected,
        }

    return results, judgments


def update_quiz_review_list(review_list, goal_id, wrong_entries, wrong_at):
    """Merge freshly wrong questions into the per-goal review list.

    Dedupes by question text within the goal: a question missed again bumps
    ``times_seen`` and refreshes ``wrong_at`` instead of adding a second row.
    Mutates and returns ``review_list`` ({goal_id: [entry, ...]}).
    """
    entries = review_list.setdefault(str(goal_id), [])
    by_question = {entry.get("question"): entry for entry in entries}
    for wrong in wrong_entries:
        question = wrong.get("question") or ""
        existing = by_question.get(question)
        if existing is not None:
            existing["times_seen"] = int(existing.get("times_seen", 1)) + 1
            existing["wrong_at"] = wrong_at
            if wrong.get("session_title"):
                existing["session_title"] = wrong["session_title"]
            if wrong.get("expected_answer") is not None:
                existing["expected_answer"] = wrong["expected_answer"]
        else:
            entry = {
                "session_title": wrong.get("session_title", ""),
                "question": question,
                "expected_answer": wrong.get("expected_answer"),
                "wrong_at": wrong_at,
                "times_seen": 1,
            }
            entries.append(entry)
            by_question[question] = entry
    return review_list


def humanize_time_ago(epoch, now=None):
    """Humanise a unix timestamp relative to ``now`` ("3 hours ago")."""
    try:
        epoch = float(epoch)
    except (TypeError, ValueError):
        return "at an unknown time"
    now = time.time() if now is None else float(now)
    seconds = max(0, int(now - epoch))
    if seconds < 10:
        return "just now"
    if seconds < 60:
        return f"{seconds} seconds ago"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    hours = seconds // 3600
    if hours < 24:
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = hours // 24
    if days < 31:
        return f"{days} day{'s' if days != 1 else ''} ago"
    months = days // 31
    if months < 12:
        return f"{months} month{'s' if months != 1 else ''} ago"
    years = days // 365
    return f"{years} year{'s' if years != 1 else ''} ago"


def resolve_session_title(session_information, learning_path, selected_session_id=0):
    if isinstance(session_information, dict) and session_information.get("title"):
        return session_information["title"]
    path = learning_path or []
    if isinstance(selected_session_id, int) and 0 <= selected_session_id < len(path):
        session = path[selected_session_id]
        if isinstance(session, dict):
            return session.get("title") or ""
    return ""


def get_stored_quiz_results():
    return st.session_state.get(quiz_results_state_key(get_current_session_uid()))


def clear_quiz_results(session_uid):
    st.session_state.pop(quiz_results_state_key(session_uid), None)


def record_wrong_questions_for_review(goal_id, session_title, judgments):
    """Fold one submission's wrong questions into the per-goal review list.

    Also mirrors the goal's entries into a ``quiz_results_review_{goal_id}``
    session key after every update so the persistence layer (which picks up
    any ``quiz_results_*`` key automatically) keeps the review list across
    app restarts.
    """
    wrong_entries = [
        {"session_title": session_title, "question": judgment["question"],
         "expected_answer": judgment.get("expected_answer")}
        for judgment in judgments.values()
        if judgment.get("is_correct") is False
    ]
    if not wrong_entries:
        return
    if QUIZ_REVIEW_LIST_KEY not in st.session_state:
        st.session_state[QUIZ_REVIEW_LIST_KEY] = {}
    review_list = update_quiz_review_list(st.session_state[QUIZ_REVIEW_LIST_KEY], goal_id, wrong_entries, wrong_at=time.time())
    st.session_state[quiz_review_state_key(goal_id)] = list(review_list.get(str(goal_id), []))
    save_persistent_state()


def render_quiz_judgments(judgments, quiz_data):
    """Per-question verdicts and explanations after Submit Answers."""
    st.divider()
    for _kind, list_key, key_prefix in QUIZ_KIND_FIELDS:
        for i, q in enumerate((quiz_data or {}).get(list_key) or []):
            judgment = judgments.get(f"{key_prefix}{i}")
            if judgment is None:
                continue
            st.write(f"**{judgment['number']}. {q['question']}**")
            if judgment.get("verdict") == "correct":
                st.markdown("✅ Correct")
            elif judgment.get("verdict") == "incorrect":
                st.markdown("❌ Incorrect — expected answer shown below")
            else:
                st.caption("Not answered.")
            expected = format_expected_answer(judgment.get("expected_answer"))
            with st.expander("Explanation", expanded=judgment.get("verdict") == "incorrect", icon=":material/info:"):
                if judgment.get("verdict") == "incorrect" and expected:
                    st.markdown(f"**Expected answer:** {expected}")
                st.write(q.get("explanation", ""))


def render_quiz_review_list(goal_id):
    """Collapsed recap of the questions this goal still owes a correct answer."""
    entries = (st.session_state.get(QUIZ_REVIEW_LIST_KEY) or {}).get(str(goal_id))
    if not entries:
        # Restart-safe fallback: the mirrored quiz_results_review_* key is the
        # copy restored by the persistence layer.
        entries = st.session_state.get(quiz_review_state_key(goal_id)) or []
    if not entries:
        return
    count = len(entries)
    with st.expander(f"🔖 Review later — {count} question{'s' if count != 1 else ''} to revisit", expanded=False):
        st.caption("Questions answered incorrectly for this goal, most recent first.")
        for entry in sorted(entries, key=lambda e: e.get("wrong_at") or 0, reverse=True):
            times_seen = int(entry.get("times_seen", 1))
            st.markdown(f"**{entry.get('question', '')}**")
            st.caption(
                f"Missed {times_seen} time{'s' if times_seen != 1 else ''} · "
                f"last seen {humanize_time_ago(entry.get('wrong_at') or 0)} · "
                f"{entry.get('session_title') or 'earlier session'}"
            )
            expected = format_expected_answer(entry.get("expected_answer"))
            if expected:
                st.markdown(f"Expected answer: {expected}")


def render_questions(quiz_data):
    st.subheader("💡 Test Your Knowledge")
    session_uid = get_current_session_uid()
    goal_id = st.session_state["selected_goal_id"]
    goal = st.session_state["goals"][goal_id]
    session_title = resolve_session_title(None, goal.get("learning_path"),
                                          st.session_state.get("selected_session_id", 0))

    # Selections are made for every question first and judged together when
    # "Submit Answers" is pressed; nothing is scored per interaction.
    selections = {"single_choice": [], "multiple_choice": [], "true_false": [], "short_answer": []}
    question_counts = {list_key: len(quiz_data.get(list_key) or []) for _kind, list_key, _prefix in QUIZ_KIND_FIELDS}

    for i, q in enumerate(quiz_data['single_choice_questions']):
        with st.container(border=True):
            st.write(f"**{i + 1}. {q['question']}**")
            selections["single_choice"].append(
                st.radio("Options", q['options'], key=f"single_{i}", index=None, label_visibility="hidden"))

    for i, q in enumerate(quiz_data['multiple_choice_questions']):
        with st.container(border=True):
            st.write(f"**{question_counts['single_choice_questions'] + i + 1}. {q['question']}**")
            selections["multiple_choice"].append([
                option for j, option in enumerate(q['options'])
                if st.checkbox(option, key=f"multi_{i}_option_{j}")
            ])

    for i, q in enumerate(quiz_data['true_false_questions']):
        with st.container(border=True):
            st.write(f"**{question_counts['single_choice_questions'] + question_counts['multiple_choice_questions'] + i + 1}. {q['question']}**")
            selections["true_false"].append(
                st.radio("True or False?", ["True", "False"], key=f"tf_{i}", label_visibility="hidden", index=None))

    for i, q in enumerate(quiz_data['short_answer_questions']):
        with st.container(border=True):
            st.write(f"**{question_counts['single_choice_questions'] + question_counts['multiple_choice_questions'] + question_counts['true_false_questions'] + i + 1}. {q['question']}**")
            selections["short_answer"].append(
                st.text_input("Your Answer", key=f"short_{i}", label_visibility="hidden"))

    if st.button("Submit Answers", key="submit-all-answers", type="primary",
                 icon=":material/fact_check:", use_container_width=True):
        # Judge everything at once and latch the outcome (a bare button click
        # does not survive reruns) so the summary is already stored before the
        # Complete Session profile update reads it.
        results, judgments = judge_quiz_submissions(quiz_data, selections)
        results[SUBMITTED_ANSWERS_KEY] = judgments
        st.session_state[quiz_results_state_key(session_uid)] = results
        record_wrong_questions_for_review(goal_id, session_title, judgments)
        save_persistent_state()

    stored_results = st.session_state.get(quiz_results_state_key(session_uid)) or {}
    judgments = stored_results.get(SUBMITTED_ANSWERS_KEY) or {}
    if judgments:
        render_quiz_judgments(judgments, quiz_data)
        summary = summarize_quiz_results(stored_results)
        if summary["total_answered"] > 0:
            col1, col2, col3 = st.columns(3)
            col1.metric("Answered", summary["total_answered"])
            col2.metric("Correct", summary["total_correct"])
            col3.metric("Accuracy", f"{summary['accuracy']:.0%}")

    render_quiz_review_list(goal_id)

    return stored_results

def render_content_feedback_form(goal):
    st.header("🌟 Value Your Feedback!") 
    with st.form("feedback_form"):
        st.info("Your feedback helps us improve the learning experience.\nPlease take a moment to share your thoughts.")

        col1, col2 = st.columns([1, 3])
        col1.write("Clarity of Content")
        clarity = col2.feedback("stars", key="clarity")

        col1, col2 = st.columns([1, 3])
        col1.write("Relevance to Goals")
        relevance = col2.feedback("stars", key="relevance")

        col1, col2 = st.columns([1, 3])
        col1.write("Depth of Content")
        depth = col2.feedback("stars", key="depth")

        col1, col2 = st.columns([1, 3])
        col1.write("Engagement Level")
        engagement = col2.feedback("faces", key="engagement")

        additional_comments = st.text_area("Additional Comments", max_chars=500)
        feedback_data = {
            "clarity": clarity,
            "relevance": relevance,
            "depth": depth,
            "engagement": engagement,
            "additional_comments": additional_comments
        }
        submitted = st.form_submit_button("Submit Feedback", on_click=update_learner_profile_with_feedback, kwargs={"feedback_data": feedback_data, "goal": goal})
        if submitted:
            st.success("Thank you for your feedback!")

def update_learner_profile_with_feedback(goal, feedback_data, session_information=""):
    st.toast("Updating your profile...")
    if session_information != "":
        session_information = copy.deepcopy(session_information)
        session_information["if_learned"] = True
    # Quiz results accumulated by render_questions ride along as
    # quiz_performance so the profiler sees measured evidence, not just
    # self-reported feedback.
    session_title = resolve_session_title(
        session_information,
        goal.get("learning_path"),
        st.session_state.get("selected_session_id", 0),
    )
    learner_interactions = merge_quiz_performance(feedback_data, build_quiz_performance(get_stored_quiz_results(), session_title))
    new_learner_profile = update_learner_profile(goal["learner_profile"], learner_interactions, session_information=session_information, llm_type=st.session_state["llm_type"])
    if new_learner_profile is None:
        st.error("Failed to update learner profile. Please try again.")
        return False
    else:
        goal["learner_profile"] = new_learner_profile
        st.toast("🎉 Your profile has been updated!")
        return True

def load_knowledge_point_content(file_path):
    try:
        knowledge_document = json.load(open(file_path))
        return knowledge_document
    except FileNotFoundError:
        st.error("Knowledge document not found. Please make sure `knowledge_document.md` is in the correct directory.")
        return None

render_learning_content()