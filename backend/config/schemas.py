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
    provider: str = "huggingface"
    model_name: str = "sentence-transformers/all-mpnet-base-v2"


@dataclass
class SearchConfig:
    provider: str = "duckduckgo"  # tavily, serper, bing, duckduckgo, brave, searx, you
    max_results: int = 5


@dataclass
class VectorstoreConfig:
    persist_directory: str = "data/vectorstore"
    collection_name: str = "genmentor"

@dataclass
class RAGConfig:
    chunk_size: int = 1000
    num_retrieval_results: int = 5
    allow_parallel: bool = True
    max_workers: int = 3


@dataclass
class AppConfig:
    environment: str = "dev"  # dev | staging | prod
    debug: bool = True
    log_level: str = "INFO"

    llm: LLMConfig = field(default_factory=LLMConfig)
    search: SearchConfig = field(default_factory=SearchConfig)
    vectorstore: VectorstoreConfig = field(default_factory=VectorstoreConfig)
    rag: RAGConfig = field(default_factory=RAGConfig)
