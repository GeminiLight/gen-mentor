"""Tests for the Hydra/OmegaConf configuration loader (``config/loader.py``).

Covers: lazy composition of the default config, schema-backed struct mode
(unknown keys and bad types raise), the identity-cached ``get_default_config``
and its thread safety.
"""

from __future__ import annotations

import importlib
import threading

import pytest
from omegaconf import DictConfig
from omegaconf.errors import OmegaConfBaseException

from config.loader import get_default_config, load_config


# Keep first in the module: asserts that *importing* the loader does no work.
# Nothing else in the suite calls get_default_config() before this runs
# (backend main.py composes its config via a direct load_config() call).
def test_default_config_is_loaded_lazily():
    loader = importlib.import_module("config.loader")
    assert loader._default_config is None


def test_explicit_load_returns_schema_backed_config():
    cfg = load_config(config_name="main")
    assert isinstance(cfg, DictConfig)
    assert cfg.llm.provider == "openai"
    assert cfg.llm.model_name == "deepseek-v4-flash"
    assert cfg.llm.base_url is None
    assert cfg.embedding.provider == "huggingface"
    assert cfg.search.provider == "duckduckgo"
    assert cfg.search.max_results == 5
    assert cfg.vectorstore.type == "chroma"
    assert cfg.rag.chunk_size == 1000
    assert cfg.rag.max_stored_chunks == 2000
    assert cfg.server.port == 5000
    # main.yaml overrides the default.yaml log level.
    assert cfg.log_level == "DEBUG"


def test_loaded_config_is_struct_mode():
    """Merging into the structured schema leaves unknown attributes unreadable."""
    cfg = load_config(config_name="main")
    with pytest.raises(OmegaConfBaseException):
        _ = cfg.llm.typo_key


def test_config_with_typo_raises(tmp_path, monkeypatch):
    """A key missing from AppConfig must fail composition, not pass silently."""
    package = tmp_path / "badcfg_pkg"
    package.mkdir()
    (package / "__init__.py").write_text("", encoding="utf-8")
    (package / "bad.yaml").write_text("llm:\n  providr: openai\n", encoding="utf-8")
    monkeypatch.syspath_prepend(str(tmp_path))

    with pytest.raises(OmegaConfBaseException):
        load_config(config_name="bad", config_module="badcfg_pkg")


def test_config_with_wrong_value_type_raises(tmp_path, monkeypatch):
    package = tmp_path / "badtype_pkg"
    package.mkdir()
    (package / "__init__.py").write_text("", encoding="utf-8")
    (package / "bad.yaml").write_text("rag:\n  chunk_size: not-an-int\n", encoding="utf-8")
    monkeypatch.syspath_prepend(str(tmp_path))

    with pytest.raises(OmegaConfBaseException):
        load_config(config_name="bad", config_module="badtype_pkg")


def test_get_default_config_is_cached_as_same_object():
    assert get_default_config() is get_default_config()


def test_get_default_config_thread_safe_under_concurrent_first_calls(monkeypatch):
    """16 threads racing on the first call all receive the identical config."""
    monkeypatch.setattr("config.loader._default_config", None)

    workers = 16
    barrier = threading.Barrier(workers)
    results: list = [None] * workers
    errors: list = []

    def worker(index: int) -> None:
        try:
            barrier.wait()  # maximize contention on the lock
            results[index] = get_default_config()
        except Exception as exc:  # pragma: no cover - surfaced below
            errors.append(exc)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(workers)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert not errors, errors
    assert all(result is not None for result in results)
    assert len({id(result) for result in results}) == 1
    assert results[0] is get_default_config()
