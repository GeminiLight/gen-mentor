"""Knowledge Sources view: the web pages pinned into the current goal's knowledge base.

The backend saves pages it reads while generating learning content; this view
lists them, summarises the corpus, and lets the learner unpin a page so the
tutor no longer draws on it.
"""

import html
import time

import streamlit as st

from utils.request_api import kb_sources, kb_unpin


# --- Pure helpers -------------------------------------------------------------
# No streamlit access here, so these stay importable and testable on a bare
# interpreter. Every one of them tolerates a drifted payload shape.


def _field(source, key, default=""):
    """Read ``key`` off a source entry without trusting the payload shape."""
    if not isinstance(source, dict):
        return default
    value = source.get(key, default)
    return default if value is None else value


def _relative(count, unit):
    """``3 days``-style span, pluralised (no trailing ``ago``)."""
    return f"{count} {unit}{'' if count == 1 else 's'}"


def _humanize_age(epoch, now=None):
    """Render an epoch-seconds timestamp as a short relative age.

    Missing/zero/future timestamps yield ``"unknown"`` — there is nothing
    truthful to claim about them. ``now`` is injectable for tests.
    """

    def ago(count, unit):
        return f"{_relative(count, unit)} ago"

    if not epoch:
        return "unknown"
    try:
        age_seconds = int((time.time() if now is None else float(now)) - float(epoch))
    except (TypeError, ValueError):
        return "unknown"
    if age_seconds < 0:
        return "unknown"
    if age_seconds < 10:
        return "just now"
    if age_seconds < 60:
        return ago(age_seconds, "second")
    minutes = age_seconds // 60
    if minutes < 60:
        return ago(minutes, "minute")
    hours = minutes // 60
    if hours < 24:
        return ago(hours, "hour")
    days = hours // 24
    if days < 7:
        return ago(days, "day")
    if days < 30:
        return ago(days // 7, "week")
    if days < 365:
        return ago(days // 30, "month")
    return ago(days // 365, "year")


def _pinned_label(epoch):
    """Card-friendly phrasing of a ``pinned_at`` value."""
    age = _humanize_age(epoch)
    return "Pin time unknown" if age == "unknown" else f"Pinned {age}"


def _chunk_count(source):
    """Number of stored chunks, or 0 when the field is missing or malformed."""
    chunk_ids = _field(source, "chunk_ids", [])
    if not isinstance(chunk_ids, (list, tuple)):
        return 0
    return len(chunk_ids)


def _chunk_label(source):
    return _relative(_chunk_count(source), "chunk")


def _display_title(source):
    """The page title, falling back to the url, then to a placeholder."""
    url = str(_field(source, "source")).strip()
    title = str(_field(source, "title")).strip()
    return title or url or "Untitled page"


def _title_link_html(source):
    """Anchor markup for the card title; opens in a new tab.

    Falls back to plain text when the entry has no usable url.
    """
    title = html.escape(_display_title(source))
    url = str(_field(source, "source")).strip()
    if not url:
        return f"<span>{title}</span>"
    return (
        f'<a href="{html.escape(url, quote=True)}" target="_blank" '
        f'rel="noopener noreferrer">{title}</a>'
    )


def _source_caption(source):
    """The small meta line under a card title: url · pinned when · chunk count."""
    parts = [
        str(_field(source, "source")).strip(),
        _pinned_label(_field(source, "pinned_at", 0)),
        _chunk_label(source),
    ]
    return " · ".join(part for part in parts if part)


def _shorten(text, limit=60):
    """Truncate long titles for toasts without cutting mid-word spacing."""
    text = str(text)
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def _normalize_sources(raw):
    """Keep only dict entries so a drifted payload cannot crash the render."""
    if not isinstance(raw, list):
        return []
    return [entry for entry in raw if isinstance(entry, dict)]


# --- Rendering ----------------------------------------------------------------


def render_sources():
    if not st.session_state.get("if_complete_onboarding"):
        st.switch_page("views/onboarding.py")

    goal = st.session_state["goals"][st.session_state["selected_goal_id"]]
    goal_id = goal.get("id", "")

    st.title("Knowledge Sources")
    st.write("Pages the system saved while generating this goal's learning content — the tutor draws on them when answering.")

    sources = _normalize_sources(kb_sources(goal_id))
    total_chunks = sum(_chunk_count(source) for source in sources)

    pages_col, chunks_col, refresh_col = st.columns([2, 2, 1])
    pages_col.metric("Total pages", len(sources))
    chunks_col.metric("Total chunks", total_chunks)
    with refresh_col:
        st.write("")  # nudge the button towards the metric baseline
        if st.button("Refresh", icon=":material/refresh:", use_container_width=True):
            # Data changes as the user studies in another tab; pull it again.
            st.rerun()

    if not sources:
        st.info(
            "No pages saved for this goal yet. The knowledge base fills in automatically as "
            "learning documents are generated — learn a session from the Learning Path page, or "
            "regenerate a knowledge point's content, and the pages the system reads along the "
            "way will appear here."
        )
        return

    st.markdown("#### 📚 Saved Pages")
    for index, source in enumerate(sources):
        _render_source_card(goal_id, source, index)


def _render_source_card(goal_id, source, index):
    url = str(_field(source, "source")).strip()
    title = _display_title(source)

    with st.container(border=True):
        text_col, action_col = st.columns([6, 1])
        with text_col:
            st.markdown(_title_link_html(source), unsafe_allow_html=True)
            st.caption(_source_caption(source))
        with action_col:
            with st.popover("Unpin", icon=":material/delete:", use_container_width=True):
                st.caption(f"Remove {_shorten(title)} from this goal's knowledge base? The tutor will no longer draw on it.")
                if st.button("Confirm unpin", key=f"unpin_confirm_{index}", use_container_width=True, type="primary"):
                    _unpin_source(goal_id, url, title)


def _unpin_source(goal_id, url, title):
    if not url:
        st.warning("This source has no URL, so it cannot be unpinned.")
        return
    if kb_unpin(goal_id, url):
        st.toast(f"Unpinned {_shorten(title)}.", icon=":material/check_circle:")
        st.rerun()
    # On failure the client already showed the error; keep the card so the
    # user can retry.


render_sources()
