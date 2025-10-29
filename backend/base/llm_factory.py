import logging
from typing import Optional, Union, Any, Dict
from omegaconf import DictConfig, OmegaConf
from utils.config import ensure_config_dict

from langchain_core.language_models import BaseChatModel
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv
load_dotenv(override=True)

logger = logging.getLogger(__name__)


class LLMFactory:

    @staticmethod
    def create(
        model: Optional[str] = None,
        model_provider: Optional[str] = None,
        temperature: float = 0,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        **kwargs
    ) -> BaseChatModel:
        """Initialize LLM client with model parameters.

        Args:
            model: Model name (e.g., 'gpt-4', 'claude-3-5-sonnet-20241022')
            model_provider: Provider name (e.g., 'openai', 'anthropic', 'ollama')
            temperature: Temperature for model responses (default: 0)
            base_url: Custom base URL for API endpoint
            api_key: Custom API key
            llm: Pre-configured LLM instance (if provided, other params ignored)
            **kwargs: Additional parameters passed to init_chat_model

        Raises:
            ValueError: If neither llm nor model is provided
        """
        if model is None:
            model = "claude-3-5-sonnet-20241022"
            model_provider = model_provider or "anthropic"

        config_kwargs = {
            "model": model,
            "model_provider": model_provider,
            "temperature": temperature,
            **kwargs
        }

        if base_url is not None:
            config_kwargs["base_url"] = base_url

        if api_key is not None:
            config_kwargs["api_key"] = api_key
        elif base_url is not None and model_provider == "openai":
            config_kwargs["api_key"] = "dummy-key-for-vllm"

        llm = init_chat_model(**config_kwargs)
        return llm

    @classmethod
    def from_config(cls, config: Union[DictConfig, OmegaConf, Dict[str, Any]]) -> "LLMFactory":
        """Initialize LLM client from WorkflowConfig.

        This is a convenience method that extracts LLM parameters from
        WorkflowConfig and creates an LLMFactory instance.

        Args:
            config: Workflow configuration containing model settings

        Returns:
            LLMFactory instance initialized from config
        """
        config = ensure_config_dict(config)
        return init_chat_model(
            model=config.get("model_name", "deepseek-chat"),
            model_provider=config.get("model_provider", "deepseek"),
            base_url=config.get("base_url", None),
            # api_key=config.api_key,
            temperature=0,  # Always 0 for deterministic results
        )
    

if __name__ == "__main__":
    llm = LLMFactory.create(
        model="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        model_provider="together",
        temperature=0
    )


    conversation = [
        {"role": "system", "content": "You are a helpful assistant that translates English to French."},
        {"role": "user", "content": "Translate: I love programming."},
        {"role": "assistant", "content": "J'adore la programmation."},
        {"role": "user", "content": "Translate: I love building applications."}
    ]


    from langchain.agents import create_agent
    agent = create_agent(
        model=llm,
        tools=[],
        system_prompt="You are a helpful assistant."
    )
    result = agent.invoke({"input": "What is the capital of Germany?"})
    print(result['messages'][-1].content)