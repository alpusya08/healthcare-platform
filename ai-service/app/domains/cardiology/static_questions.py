"""Static questions for cardiology domain — simple conversational Russian, no medical jargon."""
from __future__ import annotations

import uuid

from app.core.entities.question import Question
from app.core.enums import QuestionType

# Each question has option_values aligned with options list.
# None means "use median imputation" for that choice.
_QUESTIONS = [
    {
        "feature_name": "chest_pain_type",
        "question_text": "Как лучше всего описать то, что вы чувствуете в груди?",
        "type": "single_choice",
        "options": [
            "Давящая или сжимающая боль — появляется при ходьбе или усилии, проходит в покое",
            "Боль есть, но она непредсказуемая — бывает и в покое без видимой причины",
            "Покалывание, жжение или резкая боль, не связанная с нагрузкой",
            "Болей в груди нет",
        ],
        "option_values": [3, 1, 2, 0],
        "hint": None,
    },
    {
        "feature_name": "exercise_angina",
        "question_text": "Когда вы быстро идёте, поднимаетесь по лестнице или делаете физическую работу — появляется ли боль в груди или сильная одышка?",
        "type": "single_choice",
        "options": [
            "Да, практически всегда",
            "Иногда бывает",
            "Нет, при нагрузке всё нормально",
        ],
        "option_values": [1, 1, 0],
        "hint": None,
    },
    {
        "feature_name": "age",
        "question_text": "Сколько вам полных лет?",
        "type": "number",
        "options": None,
        "option_values": None,
        "hint": "Введите возраст цифрами, например: 48",
    },
    {
        "feature_name": "sex",
        "question_text": "Ваш пол?",
        "type": "single_choice",
        "options": ["Мужской", "Женский"],
        "option_values": [1, 0],
        "hint": None,
    },
    {
        "feature_name": "resting_blood_pressure",
        "question_text": "Какое у вас обычно артериальное давление в спокойном состоянии?",
        "type": "single_choice",
        "options": [
            "Нормальное — около 120/80",
            "Немного повышено — 130–140 / 80–90",
            "Повышенное — 140–160",
            "Высокое — выше 160",
            "Не знаю / не измерял(а)",
        ],
        "option_values": [115, 130, 145, 170, None],
        "hint": None,
    },
    {
        "feature_name": "cholesterol",
        "question_text": "Говорили ли вам, что у вас повышен холестерин?",
        "type": "single_choice",
        "options": [
            "Нет, холестерин в норме",
            "Да, немного повышен",
            "Да, значительно повышен",
            "Не проверялся(лась) / не знаю",
        ],
        "option_values": [185, 225, 275, None],
        "hint": None,
    },
    {
        "feature_name": "max_heart_rate",
        "question_text": "Как ведёт себя ваш пульс при физической нагрузке?",
        "type": "single_choice",
        "options": [
            "Почти не учащается, могу говорить при нагрузке",
            "Заметно учащается, но быстро восстанавливается",
            "Очень сильно учащается, долго восстанавливается",
            "Избегаю нагрузок",
        ],
        "option_values": [105, 140, 165, None],
        "hint": None,
    },
    {
        "feature_name": "fasting_blood_sugar",
        "question_text": "Есть ли у вас сахарный диабет или вам говорили, что сахар в крови повышен?",
        "type": "single_choice",
        "options": [
            "Да, есть диабет или сахар повышен",
            "Нет, всё в норме",
            "Не знаю",
        ],
        "option_values": [1, 0, 0],
        "hint": None,
    },
    {
        "feature_name": "resting_ecg",
        "question_text": "Делали ли вам ЭКГ (кардиограмму)? Если да — что сказали врачи?",
        "type": "single_choice",
        "options": [
            "Да, сказали что всё в норме",
            "Да, нашли какие-то отклонения",
            "Не делал(а) или результат неизвестен",
        ],
        "option_values": [0, 1, 0],
        "hint": None,
    },
    {
        "feature_name": "oldpeak",
        "question_text": "Проходили ли вы нагрузочный тест сердца (тредмил или велоэргометрия)?",
        "type": "single_choice",
        "options": [
            "Да, результат был нормальный",
            "Да, нашли отклонения или тест пришлось прервать",
            "Нет, не проходил(а)",
        ],
        "option_values": [0.5, 2.5, 0.0],
        "hint": None,
    },
    {
        "feature_name": "st_slope",
        "question_text": "Говорил ли вам кардиолог или терапевт об отклонениях в работе сердца или назначал ли лечение от сердца?",
        "type": "single_choice",
        "options": [
            "Да, были отклонения или назначено лечение",
            "Нет, сказали что сердце работает нормально",
            "К кардиологу не обращался(лась)",
        ],
        "option_values": [2, 0, 0],
        "hint": None,
    },
]

_QUESTION_MAP: dict[str, dict] = {q["feature_name"]: q for q in _QUESTIONS}

# Lookup: feature → {option_text: numeric_value}
OPTION_VALUE_MAP: dict[str, dict[str, float | None]] = {
    q["feature_name"]: dict(zip(q["options"], q["option_values"]))
    for q in _QUESTIONS
    if q.get("options") and q.get("option_values")
}


def get_option_numeric_value(feature_name: str, answer_text: str) -> float | None:
    """Return the numeric value for a radio-button answer, or None if unknown/median."""
    mapping = OPTION_VALUE_MAP.get(feature_name, {})
    # exact match first, then strip-match
    if answer_text in mapping:
        return mapping[answer_text]
    for opt, val in mapping.items():
        if answer_text.strip() == opt.strip():
            return val
    return None


def get_next_static_question(session, partial_features) -> "Question | None":
    from app.domains.cardiology.features import FEATURE_PRIORITY

    asked = {q.feature_name for q in session.questions if q.feature_name}
    for feature in FEATURE_PRIORITY:
        if feature in asked:
            continue
        if partial_features.get(feature) is not None:
            continue
        q_def = _QUESTION_MAP.get(feature)
        if q_def is None:
            continue
        try:
            q_type = QuestionType(q_def["type"])
        except ValueError:
            q_type = QuestionType.TEXT
        return Question(
            id=uuid.uuid4(),
            session_id=session.id,
            question_text=q_def["question_text"],
            question_type=q_type,
            options=q_def.get("options"),
            feature_name=feature,
            hint=q_def.get("hint"),
            order_index=session.questions_count,
        )
    return None
