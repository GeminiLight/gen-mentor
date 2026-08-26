from __future__ import annotations

import os
import threading
from typing import Any, Dict

from omegaconf import OmegaConf, DictConfig
from hydra import compose, initialize_config_module

from .schemas import AppConfig

__all__ = ["load_config", "default_config"]

DEFAULT_CONFIG_NAME = "main"
DEFAULT_CONFIG_MODULE = "config"


def load_config(
    *,
    config_name: str = DEFAULT_CONFIG_NAME,
    config_module: str = DEFAULT_CONFIG_MODULE,
    env_overrides: Dict[str, str] | None = None,
) -> DictConfig:
    """Compose Hydra config from a config module and validate it against ``AppConfig``.

    Uses hydra.initialize_config_module to avoid relative-path issues. The composed
    config is merged *into* the structured ``AppConfig`` schema, so unknown keys and
    wrong value types raise instead of being silently dropped, and any key omitted
    from the yaml falls back to its dataclass default.
    """

    if env_overrides:
        os.environ.update(env_overrides)

    with initialize_config_module(version_base=None, config_module=config_module):
        composed = compose(config_name=config_name)

    schema = OmegaConf.structured(AppConfig)
    cfg = OmegaConf.merge(schema, composed)
    return cfg  # type: ignore[return-value]


_default_config: DictConfig | None = None
_config_lock = threading.Lock()


def get_default_config() -> DictConfig:
    """Return the lazily composed default config, loading it on first use.

    Composing at import time would run Hydra as an import side effect, which fails
    outright when the importing process already holds Hydra's global state (e.g. a
    ``@hydra.main`` entrypoint or another ``initialize_*`` context) and pays the
    compose cost even for callers that never read the config. The lock keeps
    concurrent first calls (e.g. from request threads) from tripping over
    Hydra's global initialisation.
    """

    global _default_config
    if _default_config is None:
        with _config_lock:
            if _default_config is None:
                _default_config = load_config()
    return _default_config


def __getattr__(name: str) -> Any:
    """Expose ``default_config`` lazily while keeping the historical import path."""
    if name == "default_config":
        return get_default_config()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
