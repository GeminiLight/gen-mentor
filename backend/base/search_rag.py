import os
import logging
import threading
import time
import uuid
from typing import List, Optional, Dict, Any, Union
from omegaconf import DictConfig

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.vectorstores import VectorStore
from langchain_text_splitters.base import TextSplitter

from base.dataclass import SearchResult
from base.embedder_factory import EmbedderFactory
from base.searcher_factory import SearcherFactory, SearchRunner
from base.rag_factory import TextSplitterFactory, VectorStoreFactory
from utils.config import ensure_config_dict

logger = logging.getLogger(__name__)

SCOPE_KEY = "gm_scope_id"
CREATED_AT_KEY = "gm_created_at"


class SearchRagManager:

    def __init__(
        self,
        embedder: Embeddings,
        text_splitter: Optional[TextSplitter] = None,
        vectorstore: Optional[VectorStore] = None,
        search_runner: Optional[SearchRunner] = None,
        max_retrieval_results: int = 5,
        allow_parallel: bool = True,
        max_workers: int = 3,
        max_stored_chunks: int = 2000,
    ):
        self.embedder = embedder
        self.text_splitter = text_splitter
        self.vectorstore = vectorstore
        self.search_runner = search_runner
        self.max_retrieval_results = max_retrieval_results
        # Surfaced from `rag.allow_parallel` / `rag.max_workers` so callers that fan
        # out over knowledge points can honour the configured concurrency.
        self.allow_parallel = allow_parallel
        self.max_workers = max_workers
        # The store is a rolling cache: when the chunk count exceeds this, the
        # oldest chunks (by gm_created_at) are deleted on the next invoke().
        self.max_stored_chunks = max_stored_chunks
        # Serialise add-then-retrieve across threads: the drafter fans out over
        # knowledge points sharing this manager, and concurrent writes to the
        # Chroma sqlite store from several threads are not safe.
        self._invoke_lock = threading.Lock()

    @staticmethod
    def from_config(
        config: Union[DictConfig, Dict[str, Any]],
    ) -> "SearchRagManager":
        config = ensure_config_dict(config)
        # `embedding` is the canonical key (see config/default.yaml); `embedder` is
        # accepted for backward compatibility with older configs.
        embedding_config = config.get("embedding") or config.get("embedder") or {}
        rag_config = config.get("rag") or {}
        vectorstore_config = config.get("vectorstore") or {}

        embedder = EmbedderFactory.create(
            model=embedding_config.get("model_name", "sentence-transformers/all-mpnet-base-v2"),
            model_provider=embedding_config.get("provider", "huggingface"),
        )

        text_splitter = TextSplitterFactory.create(
            splitter_type=rag_config.get("text_splitter_type", "recursive_character"),
            chunk_size=rag_config.get("chunk_size", 1000),
            chunk_overlap=rag_config.get("chunk_overlap", 0),
        )

        vectorstore = VectorStoreFactory.create(
            vectorstore_type=vectorstore_config.get("type", "chroma"),
            collection_name=vectorstore_config.get("collection_name", "default_collection"),
            persist_directory=vectorstore_config.get("persist_directory", "./data/vectorstore"),
            embedder=embedder,
        )

        search_runner = SearchRunner.from_config(
            config=config
        )

        return SearchRagManager(
            embedder=embedder,
            text_splitter=text_splitter,
            vectorstore=vectorstore,
            search_runner=search_runner,
            max_retrieval_results=rag_config.get("num_retrieval_results", 5),
            allow_parallel=rag_config.get("allow_parallel", True),
            max_workers=rag_config.get("max_workers", 3),
            max_stored_chunks=rag_config.get("max_stored_chunks", 2000),
        )


    def search(self, query: str) -> List[SearchResult]:
        if not self.search_runner:
            raise ValueError("SearcherRunner is not initialized.")
        results = self.search_runner.invoke(query)
        return results

    def add_documents(self, documents: List[Document], metadata: Optional[Dict[str, Any]] = None) -> None:
        if len(documents) == 0:
            logger.warning("No documents to add to the vectorstore.")
            return
        if not self.vectorstore:
            raise ValueError("VectorStore is not initialized.")
        documents = [doc for doc in documents if len(doc.page_content.strip()) > 0]
        if self.text_splitter:
            split_docs = self.text_splitter.split_documents(documents)
        else:
            split_docs = documents
        if metadata:
            # Stamp provenance (scope, creation time) on every chunk so
            # retrieval can filter by scope and pruning can evict by age.
            for doc in split_docs:
                doc.metadata = {**(doc.metadata or {}), **metadata}
        self.vectorstore.add_documents(split_docs, embedding_function=self.embedder)
        logger.info(f"Added {len(split_docs)} documents to the vectorstore.")

    def retrieve(self, query: str, k: Optional[int] = None, scope_id: Optional[str] = None) -> List[Document]:
        k = k or self.max_retrieval_results
        if not self.vectorstore:
            raise ValueError("VectorStore is not initialized.")
        if scope_id is not None:
            retrieval = self.vectorstore.similarity_search(query, k=k, filter={SCOPE_KEY: scope_id})
        else:
            retrieval = self.vectorstore.similarity_search(query, k=k)
        return retrieval

    def prune(self) -> int:
        """Delete the oldest chunks beyond max_stored_chunks; returns the number removed.

        Age is the gm_created_at stamp; legacy chunks without one count as
        oldest. Bounded stores matter because search results accumulate on
        every invoke and were previously never evicted.
        """
        if not self.vectorstore:
            raise ValueError("VectorStore is not initialized.")
        collection = self.vectorstore._collection
        total = collection.count()
        if total <= self.max_stored_chunks:
            return 0
        fetched = collection.get(include=["metadatas"])
        ids = fetched.get("ids") or []
        metadatas = fetched.get("metadatas") or []
        stamped = sorted(
            (
                (float((meta or {}).get(CREATED_AT_KEY, 0.0)), doc_id)
                for doc_id, meta in zip(ids, metadatas)
            ),
            key=lambda pair: pair[0],
        )
        excess = total - self.max_stored_chunks
        oldest_ids = [doc_id for _, doc_id in stamped[:excess]]
        if oldest_ids:
            collection.delete(ids=oldest_ids)
            logger.info("Pruned %d oldest chunks from the vectorstore.", len(oldest_ids))
        return len(oldest_ids)

    def invoke(self, query: str) -> List[Document]:
        """Search the web for `query` and retrieve only this query's fresh results.

        Each call runs in its own scope: chunks are stamped with a unique
        gm_scope_id and the retrieval filters on it, so results from concurrent
        knowledge points or previous requests never leak into the context.
        Callers wanting the accumulated knowledge base instead should use
        retrieve() without a scope.
        """
        scope_id = uuid.uuid4().hex
        with self._invoke_lock:
            results = self.search(query)
            documents = [res.document for res in results if res.document is not None]
            self.add_documents(
                documents,
                metadata={SCOPE_KEY: scope_id, CREATED_AT_KEY: time.time()},
            )
            retrieved_docs = self.retrieve(query, scope_id=scope_id)
            self.prune()
        return retrieved_docs


def format_docs(docs: List[Document]) -> str:
    formatted_chunks: List[str] = []
    for idx, doc in enumerate(docs):
        title = doc.metadata.get("title") if doc.metadata else None
        source = doc.metadata.get("source") if doc.metadata else None
        header_parts = [f"[{idx}]"]
        if title:
            header_parts.append(title)
        if source:
            header_parts.append(f"Source: {source}")
        header = " | ".join(header_parts)
        body = doc.page_content.strip()
        formatted_chunks.append(f"{header}\n{body}")
    return "\n\n".join(formatted_chunks)



if __name__ == "__main__":
    # python -m base.search_rag
    embedder = EmbedderFactory.create(
        model="sentence-transformers/all-mpnet-base-v2",
        model_provider="huggingface"
    )

    searcher = SearcherFactory.create(
        provider="duckduckgo",
        max_results=5,
    )

    search_runner = SearchRunner(
        searcher=searcher,
        loader_type="web",
        max_search_results=5,
    )

    text_splitter = TextSplitterFactory.create(
        splitter_type="recursive_character",
        chunk_size=1000,
        chunk_overlap=0,
    )

    vectorstore = VectorStoreFactory.create(
        vectorstore_type="chroma",
        collection_name="example_collection",
        persist_directory="./data/vectorstore",
        embedder=embedder,
    )

    rag_manager = SearchRagManager(
        embedder=embedder,
        text_splitter=text_splitter,
        vectorstore=vectorstore,
        search_runner=search_runner,
    )

    from config import default_config
    rag_manager = SearchRagManager.from_config(default_config)

    results = rag_manager.search("LangChain community utilities")
    print(f"Retrieved {len(results)} search results.")
    documents = [res.document for res in results if res.document is not None]
    rag_manager.add_documents(documents=documents)

    retrieved_docs = rag_manager.retrieve("LangChain community utilities", k=5)
    print(f"Retrieved {len(retrieved_docs)} documents from vectorstore.")
    print(format_docs(retrieved_docs))