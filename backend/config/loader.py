from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

from omegaconf import OmegaConf, DictConfig
from hydra import compose, initialize_config_module

from .schemas import AppConfig


def load_config(
    *,
    config_name: str = "main",
    config_module: str = "config",
    env_overrides: Dict[str, str] | None = None,
) -> DictConfig:
    """Compose Hydra config from a config module with optional env overrides.

    Uses hydra.initialize_config_module to avoid relative-path issues.
    """

    if env_overrides:
        os.environ.update(env_overrides)

    with initialize_config_module(version_base=None, config_module=config_module):
        cfg = compose(config_name=config_name)
        _ = OmegaConf.structured(AppConfig)
        return cfg


default_config = load_config()
