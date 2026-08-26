"""Concurrency behaviour of SearchRagManager: network phases must overlap."""

import time

from langchain_core.documents import Document
from langchain_core.embeddings import FakeEmbeddings

from base.rag_factory import VectorStoreFactory
from base.search_rag import KB_GOAL_KEY, SCOPE_KEY, SearchRagManager


def _make_manager(tmp_path, *, search_delay=0.5, n=4):
    embedder = FakeEmbeddings(size=32)
    manager = SearchRagManager(
        embedder=embedder,
        vectorstore=VectorStoreFactory.create(
            vectorstore_type="chroma", collection_name="par",
            persist_directory=str(tmp_path), embedder=embedder,
        ),
        kb_vectorstore=VectorStoreFactory.create(
            vectorstore_type="chroma", collection_name="par_kb",
            persist_directory=str(tmp_path), embedder=embedder,
        ),
    )

    class Result:
        def __init__(self, query):
            self.document = Document(
                page_content=f"content about {query}", metadata={"source": query}
            )

    def slow_search(query):
        time.sleep(search_delay)  # simulates the network phase
        return [Result(query)]

    manager.search_runner = type("S", (), {"invoke": staticmethod(slow_search)})()
    return manager, n


def test_concurrent_invokes_overlap_network_phases(tmp_path):
    """4 queries whose searches each 'take' 0.5s must finish in << 2.0s.

    The store lock covers only local mutations; the network phase runs in
    parallel across the drafter's fan-out threads.
    """
    from concurrent.futures import ThreadPoolExecutor

    manager, n = _make_manager(tmp_path)
    start = time.time()
    with ThreadPoolExecutor(max_workers=n) as executor:
        outputs = list(executor.map(lambda i: manager.invoke(f"q{i}", pin_goal_id="g1"), range(n)))
    wall = time.time() - start
    assert wall < n * 0.5 * 0.8, f"network phases did not overlap: {wall:.2f}s"

    for i, docs in enumerate(outputs):
        assert len(docs) == 1
        assert docs[0].metadata["source"] == f"q{i}"
        assert SCOPE_KEY in docs[0].metadata


def test_kb_pin_copies_embeddings_without_reembedding(tmp_path):
    """Pinned chunks land in the KB under the goal's namespace with prefixed ids."""
    manager, _ = _make_manager(tmp_path, search_delay=0.0, n=1)
    manager.invoke("pandas", pin_goal_id="g9")
    kb_ids = manager.kb_vectorstore._collection.get(where={KB_GOAL_KEY: "g9"}, include=[])["ids"]
    assert len(kb_ids) == 1
    assert kb_ids[0].startswith("kb-g9-")
    hits = manager.retrieve_kb("g9", "pandas", k=5)
    assert len(hits) == 1
    assert hits[0].metadata["source"] == "pandas"


def test_scope_isolation_holds_across_concurrent_invokes(tmp_path):
    """Each concurrent query retrieves only its own freshly-searched content."""
    from concurrent.futures import ThreadPoolExecutor

    manager, n = _make_manager(tmp_path)
    with ThreadPoolExecutor(max_workers=n) as executor:
        outputs = list(executor.map(lambda i: manager.invoke(f"q{i}"), range(n)))
    scope_ids = [docs[0].metadata[SCOPE_KEY] for docs in outputs]
    assert len(set(scope_ids)) == n  # every query got its own scope
