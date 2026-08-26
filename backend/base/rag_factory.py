import os
import logging
from pathlib import Path
from typing import List, Optional

from langchain_core.embeddings import Embeddings
from langchain_core.vectorstores import VectorStore
from langchain_text_splitters.base import TextSplitter

logger = logging.getLogger(__name__)

# Relative persist_directory values (e.g. the "data/vectorstore" default in
# config/default.yaml) are anchored here, so the store always lands under
# backend/ regardless of the working directory the process was started from.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent


class TextSplitterFactory:
    """
    Factory class to create text splitter instances based on specified type.
    
    Supported splitter types:
    - "recursive_character": Recursive character-based text splitter.
    - "character": Character-based text splitter.
    - "spacy": SpaCy-based text splitter.
    """

    @staticmethod
    def create(
        splitter_type: str = "recursive_character",
        chunk_size: int = 1000,
        chunk_overlap: int = 0,
    ) -> TextSplitter:
        splitter_type = splitter_type.lower()
        if splitter_type in ["recursive_character"]:
            from langchain_text_splitters import RecursiveCharacterTextSplitter
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        elif splitter_type in ["character"]:
            from langchain_text_splitters import CharacterTextSplitter
            text_splitter = CharacterTextSplitter.from_tiktoken_encoder(
                encoding_name="cl100k_base", chunk_size=chunk_size, chunk_overlap=chunk_overlap
            )
        elif splitter_type in ["spacy"]:
            from langchain_text_splitters import SpacyTextSplitter
            text_splitter = SpacyTextSplitter(chunk_size=chunk_size)
        else:
            raise ValueError(f"Unsupported text splitter type: {splitter_type}")
        return text_splitter


class VectorStoreFactory:

    @staticmethod
    def create(
        vectorstore_type: str = "chroma",
        collection_name: str = "default",
        persist_directory: str = "./data/vectorstore",
        embedder: Optional[Embeddings] = None,
    ) -> VectorStore:
        vectorstore_type = vectorstore_type.lower()
        if vectorstore_type in ["chroma"]:
            from langchain_chroma import Chroma
            persist_dir = Path(persist_directory)
            if not persist_dir.is_absolute():
                persist_dir = _BACKEND_ROOT / persist_dir
            vectorstore = Chroma(
                collection_name=collection_name,
                embedding_function=embedder,
                persist_directory=str(persist_dir),
            )
            logger.info(f'There are {vectorstore._collection.count()} records in the collection')
        else:
            raise ValueError(f"Unsupported vectorstore type: {vectorstore_type}")
        return vectorstore

