from typing import Any

from .loader import DEFAULT_CONFIG_MODULE, DEFAULT_CONFIG_NAME, get_default_config, load_config
from .schemas import (
    AppConfig,
    EmbeddingConfig,
    LLMConfig,
    RAGConfig,
    SearchConfig,
    ServerConfig,
    VectorstoreConfig,
)

__all__ = [
    "load_config",
    "get_default_config",
    "default_config",
    "DEFAULT_CONFIG_NAME",
    "DEFAULT_CONFIG_MODULE",
    "AppConfig",
    "LLMConfig",
    "EmbeddingConfig",
    "SearchConfig",
    "VectorstoreConfig",
    "RAGConfig",
    "ServerConfig",
]


def __getattr__(name: str) -> Any:
    """Resolve ``config.default_config`` on first access instead of at import time."""
    if name == "default_config":
        return get_default_config()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
