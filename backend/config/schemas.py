from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class LLMConfig:
    """Configuration for the LLM provider. See LangChain documentation for details."""
    provider: str = "deepseek"  # e.g., openai, azure-openai, ollama, anthropic, groq
    model_name: str = "deepseek-chat"
    base_url: Optional[str] = None


@dataclass
class EmbeddingConfig:
    """Configuration for the embedding model consumed by EmbedderFactory."""
    provider: str = "huggingface"  # huggingface, openai, azure, together
    model_name: str = "BAAI/bge-small-en-v1.5"


@dataclass
class SearchConfig:
    """Configuration for web search and for loading the pages it returns."""
    provider: str = "duckduckgo"  # tavily, serper, bing, duckduckgo, brave
    max_results: int = 5
    loader_type: str = "web"  # web | docling
    # Tavily credentials (only needed when provider is tavily); a null key
    # falls back to the TAVILY_API_KEY environment variable.
    tavily_api_key: Optional[str] = None
    tavily_search_depth: str = "basic"  # basic | advanced
    # Provider-specific credentials/endpoints (only needed by some providers, e.g. bing).
    bing_subscription_key: Optional[str] = None
    bing_search_url: Optional[str] = None


@dataclass
class VectorstoreConfig:
    """Configuration for the vector store backing the RAG index."""
    type: str = "chroma"
    persist_directory: str = "data/vectorstore"
    collection_name: str = "genmentor"


@dataclass
class RAGConfig:
    """Configuration for chunking and retrieval."""
    text_splitter_type: str = "recursive_character"  # recursive_character | character | spacy
    chunk_size: int = 1000
    chunk_overlap: int = 0
    num_retrieval_results: int = 5
    allow_parallel: bool = True
    max_workers: int = 3
    max_stored_chunks: int = 2000


@dataclass
class ServerConfig:
    """Configuration for the uvicorn server started by main.py."""
    host: str = "127.0.0.1"
    port: int = 5000


@dataclass
class AppConfig:
    environment: str = "dev"  # dev | staging | prod
    debug: bool = True
    log_level: str = "INFO"

    llm: LLMConfig = field(default_factory=LLMConfig)
    embedding: EmbeddingConfig = field(default_factory=EmbeddingConfig)
    search: SearchConfig = field(default_factory=SearchConfig)
    vectorstore: VectorstoreConfig = field(default_factory=VectorstoreConfig)
    rag: RAGConfig = field(default_factory=RAGConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
