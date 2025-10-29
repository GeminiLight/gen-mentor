from typing import Any, Dict, Union, cast
from omegaconf import DictConfig, OmegaConf


def ensure_config_dict(
    config: Union[DictConfig, OmegaConf, Dict[str, Any]]
) -> Dict[str, Any]:
    """Ensure the config is a plain dictionary."""
    if isinstance(config, DictConfig):
        return cast(Dict[str, Any], OmegaConf.to_container(config, resolve=True))
    elif isinstance(config, dict):
        return config
    else:
        raise ValueError("Unsupported config type.")
    return config
