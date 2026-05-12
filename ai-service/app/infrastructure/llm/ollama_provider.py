from __future__ import annotations

import json
from typing import Any

import httpx
import structlog

from app.core.exceptions import LLMProviderError
from app.core.interfaces.llm_provider import LLMProvider

logger = structlog.get_logger()


class OllamaProvider(LLMProvider):
    """LLM provider that calls a local Ollama instance via its OpenAI-compatible API."""

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.2:3b") -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._client = httpx.AsyncClient(timeout=120.0)

    async def complete(self, prompt: str) -> str:
        try:
            response = await self._client.post(
                f"{self._base_url}/api/generate",
                json={"model": self._model, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            return response.json()["response"]
        except httpx.HTTPError as e:
            logger.error("ollama_http_error", error=str(e))
            raise LLMProviderError(f"Ollama HTTP error: {e}") from e

    async def complete_structured(self, prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
        full_prompt = (
            prompt
            + "\n\nОтветь ТОЛЬКО валидным JSON-объектом без markdown, без пояснений, без ```json."
        )
        try:
            response = await self._client.post(
                f"{self._base_url}/api/generate",
                json={
                    "model": self._model,
                    "prompt": full_prompt,
                    "stream": False,
                    "format": "json",
                },
            )
            response.raise_for_status()
            raw = response.json()["response"].strip()
            return json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error("ollama_json_parse_error", error=str(e))
            raise LLMProviderError(f"Failed to parse Ollama JSON response: {e}") from e
        except httpx.HTTPError as e:
            logger.error("ollama_http_error", error=str(e))
            raise LLMProviderError(f"Ollama HTTP error: {e}") from e

    async def aclose(self) -> None:
        await self._client.aclose()
