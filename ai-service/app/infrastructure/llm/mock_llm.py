from __future__ import annotations

import re
from typing import Any

import structlog

from app.core.interfaces.llm_provider import LLMProvider

logger = structlog.get_logger()

_FEATURE_QUESTIONS: dict[str, dict[str, Any]] = {
    "age": {
        "question_text": "Сколько вам лет?",
        "type": "number",
        "options": None,
    },
    "sex": {
        "question_text": "Укажите ваш пол",
        "type": "single_choice",
        "options": ["Мужской (1)", "Женский (0)"],
    },
    "cp": {
        "question_text": "Как бы вы описали боль в груди?",
        "type": "single_choice",
        "options": [
            "Типичная стенокардия (3)",
            "Атипичная стенокардия (2)",
            "Неангинальная боль (1)",
            "Нет боли / бессимптомная (0)",
        ],
    },
    "trestbps": {
        "question_text": "Каково ваше артериальное давление в покое (систолическое, мм рт.ст.)?",
        "type": "number",
        "options": None,
    },
    "chol": {
        "question_text": "Каков уровень холестерина в сыворотке крови (мг/дл)?",
        "type": "number",
        "options": None,
    },
    "fbs": {
        "question_text": "Уровень сахара в крови натощак выше 120 мг/дл?",
        "type": "single_choice",
        "options": ["Да (1)", "Нет (0)"],
    },
    "restecg": {
        "question_text": "Каковы результаты ЭКГ в покое?",
        "type": "single_choice",
        "options": [
            "Норма (0)",
            "Нарушения ST-T волны (1)",
            "Гипертрофия левого желудочка (2)",
        ],
    },
    "thalach": {
        "question_text": "Какова максимальная частота сердечных сокращений при нагрузке (уд/мин)?",
        "type": "number",
        "options": None,
    },
    "exang": {
        "question_text": "Возникает ли боль в груди при физической нагрузке?",
        "type": "single_choice",
        "options": ["Да (1)", "Нет (0)"],
    },
    "oldpeak": {
        "question_text": "Депрессия сегмента ST при нагрузке относительно покоя (укажите значение)",
        "type": "number",
        "options": None,
    },
    "slope": {
        "question_text": "Наклон пикового сегмента ST при нагрузке",
        "type": "single_choice",
        "options": ["Восходящий (0)", "Плоский (1)", "Нисходящий (2)"],
    },
    "ca": {
        "question_text": "Количество крупных сосудов, выявленных при флюороскопии (0–3)",
        "type": "number",
        "options": None,
    },
    "thal": {
        "question_text": "Результат нагрузочного теста (таллий-сцинтиграфия)",
        "type": "single_choice",
        "options": [
            "Норма (1)",
            "Фиксированный дефект (2)",
            "Обратимый дефект (3)",
        ],
    },
}

_FEATURE_PRIORITY = [
    "age", "sex", "cp", "trestbps", "chol",
    "thalach", "exang", "oldpeak", "fbs", "restecg",
    "slope", "ca", "thal",
]

_ALL_FEATURES = list(_FEATURE_QUESTIONS.keys())


class MockLLMProvider(LLMProvider):
    """Rule-based LLM provider for local development without an API key."""

    async def complete(self, prompt: str) -> str:
        return (
            "На основе предоставленных данных проведён предварительный анализ. "
            "Это предварительная оценка, основанная на статистической модели машинного обучения. "
            "Для окончательного диагноза и назначения лечения необходимо обратиться к врачу."
        )

    async def complete_structured(self, prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
        if "extracting structured cardiology features" in prompt:
            return self._extract_features(prompt)
        if "cardiology screening interview" in prompt:
            return self._pick_next_question(prompt)
        logger.warning("mock_llm.unknown_prompt_type", prompt_start=prompt[:80])
        return {}

    def _extract_features(self, prompt: str) -> dict[str, Any]:
        features: dict[str, Any] = {f: None for f in _ALL_FEATURES}
        qa_pairs = self._parse_qa_history(prompt)

        for feature_name, raw_answer in qa_pairs.items():
            parsed = self._parse_answer(feature_name, raw_answer)
            if parsed is not None:
                features[feature_name] = parsed

        description = self._extract_description(prompt)
        age_match = re.search(r"\b(\d{2,3})\s*(?:лет|год|года)\b", description, re.IGNORECASE)
        if age_match and features.get("age") is None:
            features["age"] = int(age_match.group(1))

        return features

    def _parse_qa_history(self, prompt: str) -> dict[str, Any]:
        feature_by_question: dict[str, str] = {
            data["question_text"]: feat for feat, data in _FEATURE_QUESTIONS.items()
        }
        result: dict[str, Any] = {}
        qa_pattern = re.compile(r"Q\d+:\s*(.+?)\nA\d+:\s*(.+?)(?=\nQ|\Z)", re.DOTALL)
        for match in qa_pattern.finditer(prompt):
            question_text = match.group(1).strip()
            answer_text = match.group(2).strip()
            if answer_text == "(not answered)":
                continue
            feature_name = feature_by_question.get(question_text)
            if feature_name:
                result[feature_name] = answer_text
        return result

    def _parse_answer(self, feature_name: str, raw: str) -> Any:
        paren_match = re.search(r"\((\d+(?:\.\d+)?)\)", raw)
        if paren_match:
            val = paren_match.group(1)
            return float(val) if "." in val else int(val)

        number_match = re.search(r"\d+(?:\.\d+)?", raw)
        if number_match:
            val = number_match.group()
            return float(val) if "." in val else int(val)

        return None

    def _extract_description(self, prompt: str) -> str:
        match = re.search(r"Patient's initial description:\s*(.+?)\n\nQ&A", prompt, re.DOTALL)
        return match.group(1).strip() if match else ""

    def _pick_next_question(self, prompt: str) -> dict[str, Any]:
        match = re.search(r"Missing features that need data:\s*(.+)", prompt)
        if not match:
            return self._question_for("age")

        raw_missing = match.group(1).strip()
        missing_set = {f.strip() for f in raw_missing.split(",")}

        for feature in _FEATURE_PRIORITY:
            if feature in missing_set:
                return self._question_for(feature)

        return self._question_for("age")

    def _question_for(self, feature: str) -> dict[str, Any]:
        q = _FEATURE_QUESTIONS[feature]
        return {
            "question_text": q["question_text"],
            "type": q["type"],
            "options": q.get("options"),
            "feature_name": feature,
        }
