"""Tests for ``SearchRunner``'s provider-shape normalization and the
``WebDocumentLoader`` dispatch in ``base/searcher_factory.py``."""

from __future__ import annotations

import pytest

from base.searcher_factory import SearchRunner, WebDocumentLoader


class DuckDuckGoStyleSearcher:
    """Accepts ``results(query, max_results=...)`` and returns a list."""

    def __init__(self):
        self.calls = []

    def results(self, query, max_results=5):
        self.calls.append({"style": "duckduckgo", "kw": "max_results", "value": max_results})
        return [
            {
                "title": "DuckDuckGo result",
                "link": "https://ddg.example/page",
                "snippet": "duckduckgo snippet",
            }
        ]


class BingStyleSearcher:
    """TypeErrors on ``max_results`` (unknown kwarg) but accepts ``num_results``."""

    def __init__(self):
        self.calls = []

    def results(self, query, num_results=5):
        self.calls.append({"style": "bing", "kw": "num_results", "value": num_results})
        return [
            {
                "title": "Bing result",
                "link": "https://bing.example/page",
                "snippet": "bing snippet",
            }
        ]


class SerperStyleSearcher:
    """Returns a single dict envelope with an ``organic`` result list."""

    def results(self, query, max_results=5):
        return {
            "searchParameters": {"q": query, "num": max_results},
            "organic": [
                {
                    "title": "Serper result",
                    "link": "https://serper.example/page",
                    "snippet": "serper snippet",
                }
            ],
        }


class GarbageSearcher:
    """Returns a shape no adapter understands."""

    def results(self, query, max_results=5):
        return "definitely not a result list"


def _runner(searcher, max_search_results=7) -> SearchRunner:
    return SearchRunner(searcher=searcher, loader_type="web", max_search_results=max_search_results)


# --- SearchRunner._raw_results normalization -----------------------------------


def test_raw_results_duckduckgo_style_max_results_kwarg():
    searcher = DuckDuckGoStyleSearcher()
    results = _runner(searcher, max_search_results=7)._raw_results("query")
    assert results == [
        {
            "title": "DuckDuckGo result",
            "link": "https://ddg.example/page",
            "snippet": "duckduckgo snippet",
        }
    ]
    assert searcher.calls == [{"style": "duckduckgo", "kw": "max_results", "value": 7}]


def test_raw_results_bing_style_falls_back_to_num_results():
    searcher = BingStyleSearcher()
    results = _runner(searcher, max_search_results=3)._raw_results("query")
    assert results[0]["link"] == "https://bing.example/page"
    # The TypeError on max_results triggered the num_results fallback.
    assert searcher.calls == [{"style": "bing", "kw": "num_results", "value": 3}]


def test_raw_results_serper_style_unwraps_organic_envelope():
    results = _runner(SerperStyleSearcher(), max_search_results=5)._raw_results("query")
    assert isinstance(results, list)
    assert results == [
        {
            "title": "Serper result",
            "link": "https://serper.example/page",
            "snippet": "serper snippet",
        }
    ]


def test_raw_results_invalid_shape_raises_value_error():
    with pytest.raises(ValueError, match="unsupported result shape"):
        _runner(GarbageSearcher())._raw_results("query")


def test_invoke_builds_structured_results_without_loading(monkeypatch):
    """invoke() maps raw results onto SearchResult; loading is stubbed out."""
    runner = _runner(DuckDuckGoStyleSearcher())
    monkeypatch.setattr(
        WebDocumentLoader, "invoke", staticmethod(lambda urls, loader_type="web": [])
    )
    results = runner.invoke("query")
    assert len(results) == 1
    assert results[0].title == "DuckDuckGo result"
    assert results[0].link == "https://ddg.example/page"
    # No page loaded -> content empty, document absent.
    assert results[0].content == ""
    assert results[0].document is None


# --- WebDocumentLoader -------------------------------------------------------------


def test_web_document_loader_rejects_unsupported_loader_type():
    with pytest.raises(ValueError, match="Unsupported loader type"):
        WebDocumentLoader.invoke(["https://example.com"], loader_type="bogus")


def test_web_document_loader_empty_urls_return_empty_list():
    assert WebDocumentLoader.invoke([], loader_type="web") == []
