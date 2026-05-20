from __future__ import annotations

import json
from typing import Any

import structlog

from app.core.interfaces.llm_provider import LLMProvider

logger = structlog.get_logger()


class MockLLMProvider(LLMProvider):
    """Stub LLM provider for local development without an API key."""

    async def complete(self, prompt: str) -> str:
        logger.debug("mock_llm.complete", prompt_len=len(prompt))
        return (
            "Предварительная оценка завершена. "
            "Для получения точного диагноза обратитесь к врачу."
        )

    async def complete_structured(self, prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
        logger.debug("mock_llm.complete_structured", prompt_len=len(prompt))
        if "next_question" in str(schema) or "question_text" in prompt:
            return {
                "done": False,
                "question": {
                    "question_text": "Как давно появились симптомы?",
                    "question_type": "choice",
                    "options": ["Сегодня", "2–3 дня", "Неделя и более"],
                    "feature_name": "symptom_duration_days",
                    "hint": None,
                },
            }
        if "triage_features" in prompt or "age" in str(schema):
            return {
                "age": 35,
                "sex": 0,
                "symptom_duration_days": 2,
                "pain_severity": 4,
                "onset_type": 0,
                "is_worsening": 0,
                "affects_daily_activity": 0,
                "has_chronic_conditions": 0,
                "takes_medications": 0,
                "prior_similar_episode": 0,
                "associated_symptoms_count": 1,
                "red_flag_present": 0,
            }
        return {}

    async def analyze_image(self, image_bytes: bytes, media_type: str, prompt: str = "") -> str:
        return "[Mock] Изображение получено. Для анализа настройте реальный LLM-провайдер."
