"""Concise provider-agnostic web search factory using LangChain community utilities.

This implementation leverages lightweight wrappers shipped with LangChain
instead of hand-written HTTP code. It supports Bing, Tavily, and Serper.dev.
"""

from __future__ import annotations

from pydoc import doc
from typing import Any, Dict, List, Union, cast
from langchain_core.documents import Document
from .dataclass import SearchResult
from pydantic import BaseModel
from omegaconf import OmegaConf, DictConfig
from utils.config import ensure_config_dict


class SearcherFactory:
    """Create concise searchers backed by LangChain community utilities."""

    @staticmethod
    def create(provider: str, **kwargs: Any) -> BaseModel:
        p = (provider or "").strip().lower()
        if p in {"duckduckgo", "duck-duck-go"}:
            from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
            wrapper = DuckDuckGoSearchAPIWrapper(region="us-en", safesearch="moderate")
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
            raise ValueError("Unsupported search provider. Choose from {'bing', 'serper', 'duckduckgo', 'brave', 'searx', 'you'}.")
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
            import bs4
            # bs4_strainer = bs4.SoupStrainer(class_=("post-title", "post-header", "post-content"))
            # loader = WebBaseLoader(urls, bs_kwargs={"parse_only": bs4_strainer},)
            # 'verify':False, 
            loader = WebBaseLoader(urls, requests_kwargs={'timeout':10})
        try:
            documents = loader.load()
        except Exception as e:
            print(f"Error loading documents from URLs: {e}")
            documents = []
        return documents


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
  
        config_dict = ensure_config_dict(config)
        searcher = SearcherFactory.create(
            provider=config_dict.get("search", {}).get("provider", "duckduckgo"),
            **config_dict,
        )
        return SearchRunner(
            searcher=searcher,
            loader_type=config_dict.get("search", {}).get("loader_type", "web"),
            max_search_results=config_dict.get("search", {}).get("max_results", 5),
        )

    def invoke(self, query: str) -> List[SearchResult]:
        """Perform a search and return structured results."""
        raw_results = self.searcher.results(query, max_results=self.max_search_results)
        urls = [item.get("link", "") for item in raw_results if item.get("link")]
        url_contents = WebDocumentLoader.invoke(urls, loader_type=self.loader_type)
        url_docs_dict = {url: doc for url, doc in zip(urls, url_contents)}
        url_content_dict = {url: doc.page_content for url, doc in url_docs_dict.items()}

        structured_results: List[SearchResult] = []
        for item in raw_results:
            structured_results.append(
                SearchResult(
                    title=item.get("title", ""),
                    link=item.get("link", ""),
                    content=url_content_dict.get(item.get("link", ""), ""),
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