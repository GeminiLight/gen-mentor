from typing import Any, Dict, Mapping, Union, cast
from omegaconf import DictConfig, OmegaConf


def ensure_config_dict(
    config: Union[DictConfig, Mapping[str, Any]]
) -> Dict[str, Any]:
    """Ensure the config is a plain, fully resolved dictionary.

    Accepts an OmegaConf ``DictConfig`` (including structured/schema-backed ones,
    whose interpolations are resolved) or any mapping, and always returns a plain
    ``dict`` so callers can use ``.get()`` without struct-mode surprises.
    """
    if isinstance(config, DictConfig):
        return cast(Dict[str, Any], OmegaConf.to_container(config, resolve=True))
    if isinstance(config, dict):
        return config
    if isinstance(config, Mapping):
        return dict(config)
    raise ValueError(f"Unsupported config type: {type(config).__name__}.")
