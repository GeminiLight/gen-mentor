from langchain_core.embeddings import Embeddings
from typing import Optional


class EmbedderFactory:
    @staticmethod
    def create(
        model: str = "sentence-transformers/all-MiniLM-L6-v2", 
        model_provider: Optional[str] = "huggingface",
        ) -> Embeddings:
        """Create an embedding model instance based on the specified model name."""
        if ':' in model:
            model_provider, model = model.split(':', 1)
        else:
            model_provider = model_provider or "huggingface"
        match model_provider.lower():
            case "huggingface":
                from langchain_huggingface import HuggingFaceEmbeddings
                return HuggingFaceEmbeddings(model_name=model)
            case "openai":
                from langchain_openai import OpenAIEmbeddings
                return OpenAIEmbeddings(model=model)
            case "azure":
                from langchain_openai import AzureOpenAIEmbeddings
                return AzureOpenAIEmbeddings(model=model)
            case "together":
                from langchain_together import TogetherEmbeddings
                return TogetherEmbeddings(model=model)
            # NOTE: Add other model providers here as needed
            case _:
                raise ValueError(f"Unsupported model provider: {model_provider}")


if __name__ == "__main__":
    # Example usage
    embedder = EmbedderFactory.create(
        model="sentence-transformers/all-mpnet-base-v2", 
        model_provider="huggingface")
    text = "Hello, world!"
    embedding = embedder.embed_query(text)
    print(f"Embedding for '{text}': {embedding}")
