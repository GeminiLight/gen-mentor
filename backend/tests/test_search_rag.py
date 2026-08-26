"""Behavioral tests for ``SearchRagManager`` against a real Chroma store.

A fake embedder keeps the tests hermetic, but the vectorstore itself is real
(created through ``base.rag_factory.VectorStoreFactory`` into a per-test
``tmp_path``), because scope filtering, metadata stamping and pruning all
exercise Chroma-specific code paths.
"""

from __future__ import annotations

import time

import pytest
from langchain_core.documents import Document
from langchain_core.embeddings import DeterministicFakeEmbedding, FakeEmbeddings

from base.dataclass import SearchResult
from base.rag_factory import VectorStoreFactory
from base.search_rag import CREATED_AT_KEY, SCOPE_KEY, SearchRagManager


@pytest.fixture()
def embedder() -> DeterministicFakeEmbedding:
    # Deterministic so similarity ordering is stable within a test.
    return DeterministicFakeEmbedding(size=32)


@pytest.fixture()
def vectorstore(tmp_path, embedder):
    return VectorStoreFactory.create(
        vectorstore_type="chroma",
        collection_name="test_search_rag",
        persist_directory=str(tmp_path / "vectorstore"),
        embedder=embedder,
    )


@pytest.fixture()
def manager(vectorstore, embedder) -> SearchRagManager:
    # No text splitter: one Document == one chunk, which the assertions rely on.
    return SearchRagManager(
        embedder=embedder,
        vectorstore=vectorstore,
        max_stored_chunks=2000,
    )


# --- Scoped add / retrieve ------------------------------------------------------


def test_scoped_add_and_retrieve_isolation(manager):
    manager.add_documents(
        [Document(page_content="python variables and loops tutorial")],
        metadata={SCOPE_KEY: "scope-a", CREATED_AT_KEY: 1.0},
    )
    manager.add_documents(
        [Document(page_content="rust ownership and borrowing tutorial")],
        metadata={SCOPE_KEY: "scope-b", CREATED_AT_KEY: 2.0},
    )

    only_a = manager.retrieve("python tutorial", scope_id="scope-a")
    only_b = manager.retrieve("python tutorial", scope_id="scope-b")

    assert [d.page_content for d in only_a] == ["python variables and loops tutorial"]
    assert [d.page_content for d in only_b] == ["rust ownership and borrowing tutorial"]


def test_unscoped_retrieve_sees_all_scopes(manager):
    manager.add_documents(
        [Document(page_content="python variables tutorial")],
        metadata={SCOPE_KEY: "scope-a", CREATED_AT_KEY: 1.0},
    )
    manager.add_documents(
        [Document(page_content="rust ownership tutorial")],
        metadata={SCOPE_KEY: "scope-b", CREATED_AT_KEY: 2.0},
    )

    everything = manager.retrieve("tutorial", k=10)
    assert len(everything) == 2


def test_retrieve_without_k_uses_configured_default(tmp_path):
    embedder = DeterministicFakeEmbedding(size=16)
    vectorstore = VectorStoreFactory.create(
        vectorstore_type="chroma",
        collection_name="test_default_k",
        persist_directory=str(tmp_path / "vs"),
        embedder=embedder,
    )
    manager = SearchRagManager(embedder=embedder, vectorstore=vectorstore, max_retrieval_results=1)
    manager.add_documents(
        [Document(page_content=f"document number {i}") for i in range(4)],
        metadata={SCOPE_KEY: "s", CREATED_AT_KEY: 1.0},
    )
    assert len(manager.retrieve("document")) == 1


# --- Metadata stamping -------------------------------------------------------------


def test_add_documents_stamps_scope_and_time_preserving_original_metadata(tmp_path):
    # FakeEmbeddings (random vectors) is enough here: no ordering is asserted.
    embedder = FakeEmbeddings(size=8)
    vectorstore = VectorStoreFactory.create(
        vectorstore_type="chroma",
        collection_name="test_metadata_stamp",
        persist_directory=str(tmp_path / "vs"),
        embedder=embedder,
    )
    manager = SearchRagManager(embedder=embedder, vectorstore=vectorstore)

    before = time.time()
    original = Document(
        page_content="a page about pandas dataframes",
        metadata={"title": "Pandas guide", "source": "https://example.com/pandas"},
    )
    manager.add_documents([original], metadata={SCOPE_KEY: "scope-x", CREATED_AT_KEY: 123.5})

    retrieved = manager.retrieve("pandas", scope_id="scope-x")
    assert len(retrieved) == 1
    stamped = retrieved[0].metadata
    # Original metadata preserved...
    assert stamped["title"] == "Pandas guide"
    assert stamped["source"] == "https://example.com/pandas"
    # ...and provenance stamps added.
    assert stamped[SCOPE_KEY] == "scope-x"
    assert stamped[CREATED_AT_KEY] == 123.5


def test_add_documents_without_metadata_leaves_docs_unstamped(manager):
    manager.add_documents([Document(page_content="legacy chunk", metadata={"n": 1})])
    retrieved = manager.retrieve("legacy")
    assert retrieved[0].metadata == {"n": 1}


@pytest.mark.xfail(
    reason="Real bug in SearchRagManager.add_documents: input consisting only of "
    "blank documents is filtered to an empty list but still passed to "
    "Chroma.add_documents, whose upsert rejects empty embeddings with "
    "ValueError instead of the intended no-op (the empty-input early return "
    "only fires on an empty *input* list, not an empty post-filter list).",
    raises=ValueError,
)
def test_add_documents_ignores_empty_and_blank_documents(manager):
    manager.add_documents(
        [Document(page_content="   "), Document(page_content="", metadata={})]
    )
    assert manager.retrieve("anything", k=10) == []


# --- prune --------------------------------------------------------------------------


def test_prune_evicts_oldest_beyond_cap_with_unstamped_legacy_first(tmp_path):
    embedder = DeterministicFakeEmbedding(size=16)
    vectorstore = VectorStoreFactory.create(
        vectorstore_type="chroma",
        collection_name="test_prune",
        persist_directory=str(tmp_path / "vs"),
        embedder=embedder,
    )
    manager = SearchRagManager(embedder=embedder, vectorstore=vectorstore, max_stored_chunks=2)

    # A legacy chunk with no gm_created_at stamp: counts as the oldest.
    manager.add_documents([Document(page_content="legacy chunk")])
    # Then three stamped chunks with increasing creation times.
    for i, stamp in enumerate((100.0, 200.0, 300.0)):
        manager.add_documents(
            [Document(page_content=f"stamped chunk {i}")],
            metadata={SCOPE_KEY: f"s{i}", CREATED_AT_KEY: stamp},
        )
    assert vectorstore._collection.count() == 4

    removed = manager.prune()

    assert removed == 2  # 4 stored - cap 2
    remaining = vectorstore._collection.get(include=["metadatas"])
    remaining_times = sorted(
        float((meta or {}).get(CREATED_AT_KEY, 0.0)) for meta in remaining["metadatas"]
    )
    # The unstamped legacy chunk (implicitly 0.0) and the 100.0 chunk were evicted.
    assert remaining_times == [200.0, 300.0]


def test_prune_noop_at_or_below_cap(manager, vectorstore):
    manager.add_documents(
        [Document(page_content="only chunk")],
        metadata={SCOPE_KEY: "s", CREATED_AT_KEY: 1.0},
    )
    assert manager.prune() == 0
    assert vectorstore._collection.count() == 1


# --- invoke ---------------------------------------------------------------------------


class FakeSearchRunner:
    """Stands in for SearchRunner.invoke(): returns canned SearchResults."""

    def __init__(self, documents):
        self._documents = documents
        self.queries = []

    def invoke(self, query):
        self.queries.append(query)
        return [
            SearchResult(
                title=f"result {i}",
                link=f"https://example.com/{i}",
                snippet=f"snippet {i}",
                document=document,
            )
            for i, document in enumerate(self._documents)
        ]


def test_invoke_returns_only_this_querys_fresh_results(tmp_path):
    embedder = DeterministicFakeEmbedding(size=16)
    vectorstore = VectorStoreFactory.create(
        vectorstore_type="chroma",
        collection_name="test_invoke_scope",
        persist_directory=str(tmp_path / "vs"),
        embedder=embedder,
    )
    runner = FakeSearchRunner(
        [
            Document(page_content="fresh result about langchain"),
            Document(page_content="another fresh result about testing"),
        ]
    )
    manager = SearchRagManager(
        embedder=embedder, vectorstore=vectorstore, search_runner=runner
    )

    # A stale chunk from an earlier query must not leak into this invoke().
    manager.add_documents(
        [Document(page_content="stale chunk from an earlier query")],
        metadata={SCOPE_KEY: "earlier-query", CREATED_AT_KEY: 1.0},
    )

    retrieved = manager.invoke("langchain testing")

    assert runner.queries == ["langchain testing"]
    assert retrieved, "invoke() should return this query's documents"
    contents = [d.page_content for d in retrieved]
    assert "stale chunk from an earlier query" not in contents
    assert "fresh result about langchain" in contents
    # Every returned chunk belongs to one single fresh scope...
    scope_ids = {d.metadata[SCOPE_KEY] for d in retrieved}
    assert len(scope_ids) == 1
    # ...which is not the earlier query's scope, and is timestamped for pruning.
    fresh_scope = scope_ids.pop()
    assert fresh_scope != "earlier-query"
    assert all(d.metadata[CREATED_AT_KEY] > 0 for d in retrieved)


def test_search_without_runner_raises(manager):
    with pytest.raises(ValueError, match="SearcherRunner is not initialized"):
        manager.search("anything")
