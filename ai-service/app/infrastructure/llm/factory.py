from app.config import Settings
from app.core.interfaces.llm_provider import LLMProvider
from app.infrastructure.llm.claude_client import ClaudeLLMProvider


def create_llm_provider(settings: Settings) -> LLMProvider:
    if settings.llm_provider == "anthropic":
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required when llm_provider=anthropic")
        return ClaudeLLMProvider(
            api_key=settings.anthropic_api_key,
            model=settings.anthropic_model,
        )
    raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")
