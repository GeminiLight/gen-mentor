"""Concise provider-agnostic web search factory using LangChain community utilities.

DuckDuckGo/Bing/Serper/Brave use lightweight wrappers shipped with LangChain;
Tavily is spoken to directly over REST because its response already carries the
page content, which lets the runner skip fetching pages entirely.
"""

from __future__ import annotations

import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Union, cast
from langchain_core.documents import Document
from .dataclass import SearchResult
from pydantic import BaseModel
from omegaconf import OmegaConf, DictConfig
from utils.config import ensure_config_dict

logger = logging.getLogger(__name__)

TAVILY_ENDPOINT = "https://api.tavily.com/search"


class TavilySearcher:
    """Tavily REST client shaped like the LangChain search wrappers.

    Tavily is built for LLM retrieval: one call returns ranked results WITH
    extracted page content (``raw_content``), so the runner never has to crawl
    the result pages itself — that page-fetch phase is the single biggest
    chunk of end-to-end search latency.
    """

    # Signals SearchRunner that results already contain usable page content.
    provides_content = True

    def __init__(self, api_key: Optional[str] = None, search_depth: str = "basic", timeout_s: float = 20.0):
        self.api_key = api_key or os.getenv("TAVILY_API_KEY", "")
        if not self.api_key:
            raise ValueError(
                "Tavily search requires an API key: set TAVILY_API_KEY in the "
                "environment / backend/.env, or search.tavily_api_key in the config."
            )
        self.search_depth = search_depth if search_depth in {"basic", "advanced"} else "basic"
        self.timeout_s = timeout_s

    def results(self, query: str, max_results: int = 5, **kwargs: Any) -> List[Dict[str, Any]]:
        import httpx

        payload = {
            "query": query,
            "max_results": max(1, int(max_results)),
            "search_depth": self.search_depth,
            "include_raw_content": True,
        }
        last_error = ""
        for attempt in range(3):
            try:
                response = httpx.post(
                    TAVILY_ENDPOINT,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=payload,
                    timeout=self.timeout_s,
                )
                if response.status_code == 200:
                    raw = response.json().get("results", [])
                    return [
                        {
                            "title": item.get("title", ""),
                            "link": item.get("url", ""),
                            "snippet": item.get("content", ""),
                            "raw_content": item.get("raw_content") or item.get("content") or "",
                            "score": item.get("score"),
                        }
                        for item in raw
                    ]
                # 429/5xx are worth one retry; 4xx otherwise is fatal.
                if response.status_code == 429 or response.status_code >= 500:
                    last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                else:
                    raise ValueError(f"Tavily search failed: HTTP {response.status_code}: {response.text[:200]}")
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = str(exc)
        raise ValueError(f"Tavily search failed after retries: {last_error}")


class SearcherFactory:
    """Create concise searchers backed by LangChain community utilities."""

    @staticmethod
    def create(provider: str, **kwargs: Any) -> Any:
        p = (provider or "").strip().lower()
        if p in {"duckduckgo", "duck-duck-go"}:
            from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
            wrapper = DuckDuckGoSearchAPIWrapper(region="us-en", safesearch="moderate")
        elif p in {"tavily", "tavily-search"}:
            wrapper = TavilySearcher(
                api_key=kwargs.get("tavily_api_key"),
                search_depth=kwargs.get("tavily_search_depth", "basic"),
            )
        elif p in {"serper", "serper.dev", "google-serper"}:
            from langchain_community.utilities import GoogleSerperAPIWrapper
            wrapper = GoogleSerperAPIWrapper()
        elif p in {"bing", "microsoft-bing"}:
            from langchain_community.utilities import BingSearchAPIWrapper
            bing_subscription_key = kwargs.get("bing_subscription_key", None)
            bing_search_url = kwargs.get("bing_search_url", None)
            assert bing_subscription_key is not None, "bing_subscription_key is required for BingSearchAPIWrapper"
            assert bing_search_url is not None, "bing_search_url is required for BingSearchAPIWrapper"
            wrapper = BingSearchAPIWrapper(bing_subscription_key=bing_subscription_key, bing_search_url=bing_search_url)
        elif p in {"brave", "brave-search"}:
            from langchain_community.utilities import BraveSearchWrapper
            wrapper = BraveSearchWrapper()
        else:
            raise ValueError("Unsupported search provider. Choose from {'duckduckgo', 'tavily', 'serper', 'bing', 'brave'}.")
        return wrapper


class WebDocumentLoader:

    @staticmethod
    def invoke(urls: List[str], loader_type: str = "web") -> List[Document]:
        """Load documents from the provided URLs using the specified loader."""
        if not urls:
            return []
        if loader_type == "docling":
            from langchain_docling import DoclingLoader
            loader = DoclingLoader(urls)
        elif loader_type == "web":
            from langchain_community.document_loaders import WebBaseLoader

            def load_one(url: str) -> List[Document]:
                # One loader per URL: the batch loader fetches sequentially
                # (its aiohttp path measured slower than sequential on a
                # proxied network), while per-URL workers under a thread pool
                # give real parallelism with natural failure isolation --
                # a dead link costs nothing but its own slot.
                try:
                    return WebBaseLoader(
                        [url], requests_kwargs={"timeout": 10}, continue_on_failure=True
                    ).load()
                except Exception as exc:
                    logger.warning("Failed to load %s: %s", url, exc)
                    return []

            with ThreadPoolExecutor(max_workers=max(1, min(8, len(urls)))) as executor:
                per_url: List[List[Document]] = list(executor.map(load_one, urls))
            return [doc for docs in per_url for doc in docs]
        else:
            raise ValueError(f"Unsupported loader type: {loader_type}. Choose from {{'web', 'docling'}}.")


class SearchRunner:
    """Manager to perform searches using different providers."""

    def __init__(
            self, 
            searcher: BaseModel,
            loader_type: str = "web",
            max_search_results: int = 5,
            **kwargs: Any
        ) -> None:
        self.searcher = searcher
        self.loader_type = loader_type
        self.max_search_results = max_search_results

    @staticmethod
    def from_config(
            config: Union[DictConfig, Dict[str, Any]],
        ) -> "SearchRunner":
        """Build a runner from the `search` block of an application config."""

        config_dict = ensure_config_dict(config)
        search_config: Dict[str, Any] = config_dict.get("search") or {}
        # Everything except the keys consumed below is forwarded to the provider
        # wrapper (e.g. `search.bing_subscription_key`), which is where such
        # provider-specific settings live -- not at the top level of the config.
        provider_kwargs = {
            key: value
            for key, value in search_config.items()
            if key not in {"provider", "max_results", "loader_type"} and value is not None
        }
        searcher = SearcherFactory.create(
            provider=search_config.get("provider", "duckduckgo"),
            **provider_kwargs,
        )
        return SearchRunner(
            searcher=searcher,
            loader_type=search_config.get("loader_type", "web"),
            max_search_results=search_config.get("max_results", 5),
        )

    def _raw_results(self, query: str) -> List[Dict[str, Any]]:
        """Call the provider wrapper, normalising its result shape to a list of dicts.

        The LangChain wrappers disagree: DuckDuckGo takes ``max_results`` and
        returns a list; Bing takes ``num_results``; Serper returns a single
        dict with an ``organic`` list; Brave exposes no ``results`` at all.
        """
        try:
            results = self.searcher.results(query, max_results=self.max_search_results)
        except TypeError:
            results = self.searcher.results(query, num_results=self.max_search_results)
        if isinstance(results, dict):
            # Serper-style envelope: {"searchParameters": ..., "organic": [...]}
            results = results.get("organic", [])
        if not isinstance(results, list):
            raise ValueError(
                f"Search provider {type(self.searcher).__name__} returned an "
                f"unsupported result shape ({type(results).__name__})."
            )
        return results

    def invoke(self, query: str) -> List[SearchResult]:
        """Perform a search and return structured results."""
        raw_results = self._raw_results(query)

        if getattr(self.searcher, "provides_content", False):
            # Content-bearing providers (Tavily) already extracted the page
            # text in the search call itself -- crawling the result pages again
            # would re-pay the slowest part of the pipeline.
            loaded_docs = [
                Document(
                    page_content=item.get("raw_content", ""),
                    metadata={"title": item.get("title", ""), "source": item.get("link", "")},
                )
                for item in raw_results
                if item.get("link") and (item.get("raw_content") or "").strip()
            ]
        else:
            urls = [item.get("link", "") for item in raw_results if item.get("link")]
            loaded_docs = WebDocumentLoader.invoke(urls, loader_type=self.loader_type)

        # Key by the loader's own metadata source, not by position: with
        # continue_on_failure the loader skips bad URLs, so zip(urls, docs)
        # would misalign contents with links.
        url_docs_dict = {}
        for doc in loaded_docs:
            source = (doc.metadata or {}).get("source")
            if source:
                url_docs_dict[source] = doc
        url_content_dict = {url: doc.page_content for url, doc in url_docs_dict.items()}

        structured_results: List[SearchResult] = []
        for item in raw_results:
            structured_results.append(
                SearchResult(
                    title=item.get("title", ""),
                    link=item.get("link", ""),
                    content=url_content_dict.get(item.get("link", ""), item.get("raw_content", "")),
                    snippet=item.get("snippet", None),
                    document=url_docs_dict.get(item.get("link", ""), None)
                )
            )

        return structured_results


if __name__ == "__main__":
    searcher = SearcherFactory.create(
        provider="duckduckgo",
    )

    searcher_runner = SearchRunner(
        searcher=searcher,
        loader_type="web",
        max_search_results=5,
    )
    results = searcher_runner.invoke("LangChain community utilities")
    print(results)