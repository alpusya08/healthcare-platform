from app.config import Settings
from app.core.interfaces.llm_provider import LLMProvider
from app.infrastructure.llm.claude_client import ClaudeLLMProvider
from app.infrastructure.llm.gemini_provider import GeminiLLMProvider
from app.infrastructure.llm.mock_llm import MockLLMProvider


def create_llm_provider(settings: Settings) -> LLMProvider:
    if settings.llm_provider == "anthropic":
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required when llm_provider=anthropic")
        return ClaudeLLMProvider(
            api_key=settings.anthropic_api_key,
            model=settings.anthropic_model,
        )
    if settings.llm_provider == "gemini":
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is required when llm_provider=gemini")
        return GeminiLLMProvider(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
        )
    if settings.llm_provider == "mock":
        return MockLLMProvider()
    raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")
