from __future__ import annotations

import json
from typing import Any

import structlog
from google import genai
from google.genai import types as genai_types

from app.core.exceptions import LLMProviderError
from app.core.interfaces.llm_provider import LLMProvider

logger = structlog.get_logger()


class GeminiLLMProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def complete(self, prompt: str) -> str:
        try:
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=genai_types.GenerateContentConfig(max_output_tokens=1024),
            )
            return response.text or ""
        except Exception as e:
            logger.error("gemini_api_error", error=str(e))
            raise LLMProviderError(f"Gemini API error: {e}") from e

    async def complete_structured(self, prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
        full_prompt = prompt + "\n\nRespond with ONLY a valid JSON object, no markdown, no explanation."
        try:
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=full_prompt,
                config=genai_types.GenerateContentConfig(
                    max_output_tokens=1024,
                    response_mime_type="application/json",
                ),
            )
            text = (response.text or "").strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error("gemini_json_parse_error", error=str(e))
            raise LLMProviderError(f"Failed to parse Gemini response as JSON: {e}") from e
        except Exception as e:
            logger.error("gemini_api_error", error=str(e))
            raise LLMProviderError(f"Gemini API error: {e}") from e
