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
        "hint": None,
    },
    "sex": {
        "question_text": "Укажите ваш пол",
        "type": "single_choice",
        "options": ["Мужской", "Женский"],
        "hint": None,
    },
    "cp": {
        "question_text": "Есть ли у вас боли или дискомфорт в области груди?",
        "type": "single_choice",
        "options": [
            "Да — сжимающая или давящая боль при нагрузке (1)",
            "Да — боль, не связанная с нагрузкой (2)",
            "Да — покалывание, жжение или тяжесть (3)",
            "Нет боли в груди (0)",
        ],
        "hint": (
            "Выберите вариант, который лучше всего описывает ваши ощущения. "
            "«Сжимающая при нагрузке» — это когда грудь «сжимает» или давит во время ходьбы или подъёма по лестнице, "
            "а в покое проходит. Если не уверены — выберите ближайший вариант."
        ),
    },
    "trestbps": {
        "question_text": "Каково ваше артериальное давление в покое?",
        "type": "number",
        "options": None,
        "hint": (
            "Укажите верхнее (систолическое) число в мм рт.ст. — например, если давление 130/80, введите 130. "
            "Давление измеряется тонометром в аптеке, поликлинике или домашним прибором. "
            "Если не измеряли — нажмите «Не знаю / Пропустить»."
        ),
    },
    "chol": {
        "question_text": "Знаете ли вы уровень холестерина из анализа крови?",
        "type": "number",
        "options": None,
        "hint": (
            "Холестерин определяется по анализу крови (липидный профиль). "
            "Результат обычно выдаётся в мг/дл или ммоль/л — нам нужно мг/дл. "
            "Норма — до 200 мг/дл. Если не делали анализы или не помните — нажмите «Не знаю / Пропустить»."
        ),
    },
    "fbs": {
        "question_text": "Был ли у вас когда-либо повышенный сахар в крови натощак?",
        "type": "single_choice",
        "options": ["Да, выше нормы", "Нет / Не знаю"],
        "hint": (
            "Сахар крови натощак измеряется утром до еды. "
            "Повышенным считается уровень выше 6,1 ммоль/л (или 120 мг/дл). "
            "Если не знаете — выберите «Нет / Не знаю»."
        ),
    },
    "restecg": {
        "question_text": "Делали ли вам ЭКГ (электрокардиограмму) в последнее время?",
        "type": "single_choice",
        "options": [
            "Да, сказали что всё в норме (0)",
            "Да, нашли изменения или отклонения (1)",
            "Нет / Не знаю (0)",
        ],
        "hint": (
            "ЭКГ — это запись электрической активности сердца. Делают в поликлинике, "
            "скорой помощи или кардиологии. Если делали — посмотрите заключение врача. "
            "Если не помните или не делали — выберите «Нет / Не знаю»."
        ),
    },
    "thalach": {
        "question_text": "Какой у вас максимальный пульс при физической нагрузке?",
        "type": "number",
        "options": None,
        "hint": (
            "Пульс при нагрузке — это сколько ударов в минуту делает сердце, когда вы активно двигаетесь "
            "(быстрая ходьба, подъём по лестнице, бег). Измерить можно фитнес-браслетом, смарт-часами "
            "или просто посчитать удары за 15 секунд и умножить на 4. "
            "Если не знаете — нажмите «Не знаю / Пропустить»."
        ),
    },
    "exang": {
        "question_text": "Возникает ли боль или дискомфорт в груди при физической нагрузке?",
        "type": "single_choice",
        "options": ["Да, появляется при нагрузке (1)", "Нет (0)"],
        "hint": (
            "Имеется в виду: когда вы быстро ходите, поднимаетесь по лестнице или делаете физическую работу — "
            "появляется ли боль, сжатие или тяжесть в груди?"
        ),
    },
    "oldpeak": {
        "question_text": "Проходили ли вы нагрузочный тест на беговой дорожке (тредмил-тест)?",
        "type": "single_choice",
        "options": ["Да, и в заключении указаны изменения ST (укажу значение)", "Нет / Не знаю"],
        "hint": (
            "Это специальный кардиологический тест: ЭКГ снимают во время ходьбы на беговой дорожке. "
            "Если проходили и в заключении есть цифра «депрессия ST» — введите её. "
            "Большинство пациентов этого теста не проходили — выберите «Нет / Не знаю»."
        ),
    },
    "slope": {
        "question_text": "Есть ли у вас результаты нагрузочной ЭКГ с описанием сегмента ST?",
        "type": "single_choice",
        "options": [
            "Да, восходящий ST (0)",
            "Да, плоский ST (1)",
            "Да, нисходящий ST (2)",
            "Нет / Не знаю (1)",
        ],
        "hint": (
            "Это технический показатель из нагрузочной ЭКГ. "
            "Если не проходили такое исследование — выберите «Нет / Не знаю»."
        ),
    },
    "ca": {
        "question_text": "Проходили ли вы коронарографию (исследование сосудов сердца)?",
        "type": "single_choice",
        "options": ["Нет / Не знаю (0)", "Да, 1 сосуд (1)", "Да, 2 сосуда (2)", "Да, 3+ сосуда (3)"],
        "hint": (
            "Коронарография — это рентгеновское исследование артерий сердца с введением контраста. "
            "Проводится в специализированных кардиологических центрах. "
            "Большинство пациентов его не проходили — выберите «Нет / Не знаю»."
        ),
    },
    "thal": {
        "question_text": "Делали ли вам сцинтиграфию миокарда или стресс-тест с изотопами?",
        "type": "single_choice",
        "options": [
            "Нет / Не знаю (1)",
            "Да, результат нормальный (1)",
            "Да, выявлен фиксированный дефект (2)",
            "Да, выявлен обратимый дефект (3)",
        ],
        "hint": (
            "Это редкое специализированное исследование сердца с радиоактивным веществом. "
            "Проводится только в крупных кардиологических центрах. "
            "Подавляющее большинство пациентов его не проходили — выберите «Нет / Не знаю»."
        ),
    },
}

_FEATURE_PRIORITY = [
    "age", "sex", "exang", "cp", "trestbps", "chol",
    "fbs", "thalach", "restecg", "oldpeak", "slope", "ca", "thal",
]

_ALL_FEATURES = list(_FEATURE_QUESTIONS.keys())


class MockLLMProvider(LLMProvider):
    """Rule-based LLM provider for local development without an API key."""

    async def complete(self, prompt: str) -> str:
        if "explaining a cardiology diagnosis" in prompt:
            return self._build_explanation(prompt)
        return (
            "Предварительная оценка завершена. "
            "Для получения точного диагноза и назначения лечения обратитесь к врачу."
        )

    async def complete_structured(self, prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
        if "extracting structured cardiology features" in prompt:
            return self._extract_features(prompt)
        if "cardiology screening interview" in prompt:
            return self._pick_next_question(prompt)
        logger.warning("mock_llm.unknown_prompt_type", prompt_start=prompt[:80])
        return {}

    # ── explanation ────────────────────────────────────────────────────────────

    def _build_explanation(self, prompt: str) -> str:
        is_positive = "Выявлены признаки" in prompt or "URGENT" in prompt

        if is_positive:
            return (
                "Анализ выявил ряд показателей, характерных для заболеваний сердечно-сосудистой системы. "
                "Наиболее значимыми факторами стали характер болей в груди, показатели артериального давления "
                "и реакция сердца на физическую нагрузку.\n\n"
                "Это означает, что статистическая модель, обученная на клинических данных тысяч пациентов, "
                "относит ваш профиль к группе повышенного риска ССЗ. "
                "Важно подчеркнуть: результат является предварительным и требует подтверждения у врача.\n\n"
                "Рекомендуем в ближайшее время записаться к кардиологу и пройти: "
                "ЭКГ, анализ крови на холестерин и липидный профиль, а при необходимости — ЭхоКГ."
            )
        else:
            return (
                "По результатам анализа явных признаков сердечно-сосудистых заболеваний в вашем профиле не обнаружено. "
                "Введённые вами данные соответствуют показателям с умеренным или низким кардиологическим риском.\n\n"
                "Тем не менее, это предварительная оценка на основе статистической модели — "
                "она не заменяет очного обследования у врача. "
                "Если у вас сохраняются неприятные ощущения в груди, одышка или другие симптомы — "
                "не откладывайте визит к кардиологу: лучше перепроверить.\n\n"
                "Для поддержания здоровья сердца рекомендуется ежегодная профилактическая проверка."
            )

    # ── feature extraction ─────────────────────────────────────────────────────

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

        # "Нет / Не знаю" answers for binary features default to safe value
        for feat, raw in qa_pairs.items():
            if ("не знаю" in raw.lower() or "нет" in raw.lower()) and features.get(feat) is None:
                if feat in ("fbs", "exang", "ca"):
                    features[feat] = 0
                elif feat in ("restecg", "slope", "thal"):
                    features[feat] = 0 if feat == "restecg" else 1

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
        if "не знаю" in raw.lower() or "пропустить" in raw.lower():
            return None

        paren_match = re.search(r"\((\d+(?:\.\d+)?)\)", raw)
        if paren_match:
            val = paren_match.group(1)
            return float(val) if "." in val else int(val)

        # Handle sex
        if feature_name == "sex":
            if "мужской" in raw.lower():
                return 1
            if "женский" in raw.lower():
                return 0

        # Handle fbs, exang
        if feature_name in ("fbs", "exang"):
            if "да" in raw.lower():
                return 1
            if "нет" in raw.lower():
                return 0

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
            "hint": q.get("hint"),
        }
