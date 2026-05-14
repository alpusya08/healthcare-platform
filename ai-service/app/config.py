from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "healthcare-ai-service"
    environment: Literal["dev", "test", "prod"] = "dev"

    host: str = "0.0.0.0"
    port: int = 8000

    db_url: str = Field(
        default="postgresql+asyncpg://ai_feedback:ai_feedback_secret@localhost:5432/ai_feedback"
    )

    backend_internal_token: str = Field(
        default="internal-shared-secret-between-backend-and-ai",
        alias="AI_SERVICE_INTERNAL_TOKEN",
    )

    # hybrid: LLM interviewer + XGBoost for cardiology, LLM-only for general
    # claude_only: LLM-only for all domains, XGBoost not used
    ai_mode: Literal["hybrid", "claude_only"] = Field(default="hybrid", alias="AI_MODE")

    llm_provider: Literal["anthropic", "openai", "gemini", "ollama", "mock"] = "mock"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"

    mlflow_tracking_uri: str = "http://localhost:5000"
    mlflow_model_name: str = "cardiology-diagnosis"
    mlflow_model_alias: str = "champion"

    cors_allowed_origins: str = "http://localhost:5173,http://localhost:8080"


@lru_cache
def get_settings() -> Settings:
    return Settings()
