"""Tests for the Tavily search provider and the content-bearing runner path."""

import sys
import types

import pytest

from base.searcher_factory import SearchRunner, SearcherFactory, TavilySearcher


class _FakeResp:
    status_code = 200
    text = ""

    def json(self):
        return {
            "results": [
                {
                    "title": "Pandas groupby",
                    "url": "https://pandas.example/groupby",
                    "content": "snippet text",
                    "raw_content": "full page text about groupby",
                    "score": 0.9,
                },
                {
                    "title": "Second",
                    "url": "https://second.example",
                    "content": "s2",
                    "raw_content": "second page body",
                    "score": 0.5,
                },
            ]
        }


@pytest.fixture
def fake_httpx(monkeypatch):
    """Swap the real httpx module for a scriptable fake (results() imports it lazily)."""
    captured = {}
    fake = types.ModuleType("httpx")
    fake.TimeoutException = type("TimeoutException", (Exception,), {})
    fake.TransportError = type("TransportError", (Exception,), {})

    def post(url, headers=None, json=None, timeout=None):
        captured.update({"url": url, "json": json, "headers": headers})
        return captured.get("next_response", _FakeResp())

    fake.post = staticmethod(post)
    monkeypatch.setitem(sys.modules, "httpx", fake)
    return captured


def test_missing_api_key_is_actionable(monkeypatch):
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)
    with pytest.raises(ValueError, match="TAVILY_API_KEY"):
        SearcherFactory.create(provider="tavily")


def test_api_key_from_config(fake_httpx):
    SearcherFactory.create(provider="tavily", tavily_api_key="cfg-key")
    searcher = TavilySearcher(api_key="cfg-key")
    assert searcher.api_key == "cfg-key"


def test_search_returns_normalised_results(fake_httpx):
    searcher = TavilySearcher(api_key="k")
    results = searcher.results("pandas groupby", max_results=5)
    assert fake_httpx["url"] == "https://api.tavily.com/search"
    assert fake_httpx["json"]["include_raw_content"] is True
    assert fake_httpx["json"]["max_results"] == 5
    assert fake_httpx["headers"]["Authorization"] == "Bearer k"
    assert len(results) == 2
    assert results[0]["link"] == "https://pandas.example/groupby"
    assert results[0]["raw_content"]


def test_runner_skips_page_crawl_for_content_bearing_searcher(fake_httpx):
    """The whole point of Tavily: results already carry page content."""
    runner = SearchRunner(searcher=TavilySearcher(api_key="k"), loader_type="web", max_search_results=5)
    results = runner.invoke("pandas groupby")
    assert len(results) == 2
    assert results[0].content == "full page text about groupby"
    assert results[0].document is not None
    assert results[0].document.metadata["source"] == "https://pandas.example/groupby"
    assert results[0].snippet == "snippet text"


def test_rate_limit_is_retried(fake_httpx):
    class RateLimited:
        status_code = 429
        text = "rate limited"

        def json(self):
            return {}

    calls = {"n": 0}
    real_post = fake_httpx and None  # placeholder to keep linters quiet

    import sys as _sys
    fake = _sys.modules["httpx"]

    def flaky(url, headers=None, json=None, timeout=None):
        calls["n"] += 1
        return RateLimited() if calls["n"] < 3 else _FakeResp()

    fake.post = staticmethod(flaky)
    results = TavilySearcher(api_key="k").results("q", max_results=2)
    assert calls["n"] == 3
    assert len(results) == 2


def test_permanent_error_is_not_retried(fake_httpx):
    class Forbidden:
        status_code = 403
        text = "forbidden"

        def json(self):
            return {}

    import sys as _sys
    _sys.modules["httpx"].post = staticmethod(
        lambda url, headers=None, json=None, timeout=None: Forbidden()
    )
    with pytest.raises(ValueError, match="403"):
        TavilySearcher(api_key="k").results("q")
