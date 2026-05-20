from __future__ import annotations

import base64
import json
from typing import Any

import anthropic
import structlog

from app.core.exceptions import LLMProviderError
from app.core.interfaces.llm_provider import LLMProvider

logger = structlog.get_logger()

_VISION_PROMPT = """\
Ты — медицинский ассистент. Проанализируй это медицинское изображение (рентген, ЭКГ, результаты анализов, УЗИ или другой документ).

Опиши на русском языке:
1. Тип документа (рентген/ЭКГ/УЗИ/анализы/другое)
2. Основные видимые показатели или находки
3. Любые отклонения от нормы, если они визуально заметны
4. Что пациент предоставил (краткое резюме)

Важно: не ставь диагнозов, только описывай видимое. Ответ в 3-5 предложениях на русском.
"""


class ClaudeLLMProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6") -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = model

    async def complete(self, prompt: str) -> str:
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except anthropic.APIError as e:
            logger.error("claude_api_error", error=str(e))
            raise LLMProviderError(f"Claude API error: {e}") from e

    async def complete_structured(self, prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
        full_prompt = prompt + "\n\nRespond with ONLY a valid JSON object, no markdown, no explanation."
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=1024,
                messages=[{"role": "user", "content": full_prompt}],
            )
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error("claude_json_parse_error", raw=text[:200])
            raise LLMProviderError(f"Failed to parse Claude response as JSON: {e}") from e
        except anthropic.APIError as e:
            logger.error("claude_api_error", error=str(e))
            raise LLMProviderError(f"Claude API error: {e}") from e

    async def analyze_image(self, image_bytes: bytes, media_type: str, prompt: str = _VISION_PROMPT) -> str:
        supported = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        if media_type not in supported:
            media_type = "image/jpeg"

        b64 = base64.standard_b64encode(image_bytes).decode()
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=512,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                        {"type": "text", "text": prompt},
                    ],
                }],
            )
            return response.content[0].text.strip()
        except anthropic.APIError as e:
            logger.error("claude_vision_error", error=str(e))
            return f"[Не удалось проанализировать изображение: {e}]"
