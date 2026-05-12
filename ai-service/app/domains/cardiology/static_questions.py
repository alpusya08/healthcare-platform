from app.core.entities.question import Question
from app.core.enums import QuestionType
from app.domains.cardiology.features import CARDIOLOGY_FEATURES, FEATURE_PRIORITY

import uuid

_QUESTIONS = [
    {
        "feature_name": "age",
        "question_text": "Сколько вам лет?",
        "type": "number",
        "options": None,
        "hint": "Введите полных лет",
    },
    {
        "feature_name": "sex",
        "question_text": "Ваш пол?",
        "type": "single_choice",
        "options": ["Мужской (1)", "Женский (0)"],
        "hint": None,
    },
    {
        "feature_name": "cp",
        "question_text": "Как бы вы описали боль в груди?",
        "type": "single_choice",
        "options": [
            "Типичная стенокардия — давящая боль при нагрузке (3)",
            "Атипичная стенокардия — боль без чёткой связи с нагрузкой (1)",
            "Неангинозная боль — колющая или ситуационная (2)",
            "Боли нет или бессимптомно (0)",
        ],
        "hint": "Выберите наиболее подходящее описание",
    },
    {
        "feature_name": "trestbps",
        "question_text": "Каково ваше артериальное давление в покое (в мм рт. ст.)?",
        "type": "number",
        "options": None,
        "hint": "Например: 130 (систолическое давление). Если не знаете, введите 0.",
    },
    {
        "feature_name": "chol",
        "question_text": "Каков уровень холестерина в крови (мг/дл)?",
        "type": "number",
        "options": None,
        "hint": "Посмотрите в результатах анализа крови. Если не знаете, введите 0.",
    },
    {
        "feature_name": "thalach",
        "question_text": "Какой максимальный пульс вы замечали при нагрузке (уд/мин)?",
        "type": "number",
        "options": None,
        "hint": "Например: 150. Если не измеряли — введите 0.",
    },
    {
        "feature_name": "exang",
        "question_text": "Возникает ли боль в груди или одышка при физической нагрузке?",
        "type": "single_choice",
        "options": ["Да (1)", "Нет (0)"],
        "hint": None,
    },
    {
        "feature_name": "fbs",
        "question_text": "Уровень сахара в крови натощак выше 120 мг/дл?",
        "type": "single_choice",
        "options": ["Да (1)", "Нет (0)", "Не знаю (0)"],
        "hint": "Это данные из анализа крови",
    },
    {
        "feature_name": "restecg",
        "question_text": "Каковы результаты ЭКГ в покое?",
        "type": "single_choice",
        "options": [
            "Норма (0)",
            "Аномалия ST-T (1)",
            "Гипертрофия левого желудочка (2)",
            "ЭКГ не делал (0)",
        ],
        "hint": None,
    },
    {
        "feature_name": "oldpeak",
        "question_text": "Депрессия ST-сегмента при нагрузке (по данным ЭКГ)?",
        "type": "number",
        "options": None,
        "hint": "Значение из нагрузочного теста. Если не знаете, введите 0.",
    },
]

_QUESTION_MAP = {q["feature_name"]: q for q in _QUESTIONS}


def get_next_static_question(session, partial_features) -> "Question | None":
    from app.domains.cardiology.features import FEATURE_PRIORITY, CARDIOLOGY_FEATURES

    asked = {q.feature_name for q in session.questions if q.feature_name}
    for feature in FEATURE_PRIORITY:
        if feature in asked:
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
