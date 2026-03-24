"""Keyword-based question banks for general (non-cardiology) symptom areas."""
from __future__ import annotations

import re
from typing import Any

# ── Area detection ─────────────────────────────────────────────────────────────

_AREA_PATTERNS: list[tuple[str, list[str]]] = [
    ("head", [
        r"\bголов", r"\bмигрен", r"\bголовокружен", r"\bвисо[чк]", r"\bлоб\b",
        r"\bзатылк", r"\bшум в голове",
    ]),
    ("abdomen", [
        r"\bживот", r"\bжелудо", r"\bкишечник", r"\bтошнот", r"\bрвот",
        r"\bвздути", r"\bдиаре", r"\bпонос", r"\bзапор",
        r"\bпечен", r"\bподреберь",
    ]),
    ("throat", [
        r"\bгорло", r"\bкашел", r"\bнасморк", r"\bпростуд", r"\bгрипп",
        r"\bтемператур", r"\bжар\b", r"\bлихорадк", r"\bтонзилл",
        r"\bнос\b", r"\bнасмор",
    ]),
    ("back", [
        r"\bспин", r"\bпоясниц", r"\bпозвоноч", r"\bшея\b", r"\bшее\b",
        r"\bшейн", r"\bмежпозвон",
    ]),
    ("limbs", [
        r"\bрук[аиу]\b", r"\bног[аиу]\b", r"\bплечо?\b", r"\bплеч", r"\bлокот",
        r"\bколен", r"\bголеност", r"\bсустав", r"\bмышц",
        r"\bзапясть", r"\bбедр",
    ]),
    ("skin", [
        r"\bкожа", r"\bкожн", r"\bсыпь", r"\bзуд\b", r"\bзудит",
        r"\bкрасн", r"\bпятн[оа]", r"\bвысыпан",
    ]),
]


def detect_general_area(description: str) -> str:
    lower = description.lower()
    for area, patterns in _AREA_PATTERNS:
        if any(re.search(p, lower) for p in patterns):
            return area
    return "general"


# ── Question banks ─────────────────────────────────────────────────────────────

AREA_DISPLAY_NAMES: dict[str, str] = {
    "head": "головная боль",
    "abdomen": "боль в животе",
    "throat": "простуда / боль в горле",
    "back": "боль в спине",
    "limbs": "боль в суставах / мышцах",
    "skin": "кожные симптомы",
    "general": "общие симптомы",
}

_COMMON_QUESTIONS: list[dict[str, Any]] = [
    {
        "feature_name": "duration_days",
        "question_text": "Как давно беспокоят эти симптомы?",
        "type": "single_choice",
        "options": ["Менее суток", "1–3 дня", "4–7 дней", "Больше недели", "Больше месяца"],
        "hint": None,
    },
    {
        "feature_name": "pain_severity",
        "question_text": "Оцените интенсивность ощущений по шкале от 1 до 10",
        "type": "single_choice",
        "options": ["1–3 (слабая)", "4–6 (умеренная)", "7–8 (сильная)", "9–10 (невыносимая)"],
        "hint": "1 — едва заметно, 10 — сильнейшая боль в жизни.",
    },
]

_AREA_QUESTIONS: dict[str, list[dict[str, Any]]] = {
    "head": [
        {
            "feature_name": "pain_character",
            "question_text": "Как бы вы описали характер головной боли?",
            "type": "single_choice",
            "options": ["Пульсирующая / стучит в висках", "Давящая / сжимающая", "Острая / стреляющая", "Тупая / ноющая"],
            "hint": None,
        },
        {
            "feature_name": "associated_nausea",
            "question_text": "Есть ли тошнота или рвота?",
            "type": "single_choice",
            "options": ["Да, тошнота", "Да, была рвота", "Нет"],
            "hint": None,
        },
        {
            "feature_name": "photophobia",
            "question_text": "Беспокоит ли свет или громкие звуки во время боли?",
            "type": "single_choice",
            "options": ["Да, очень раздражает", "Немного", "Нет"],
            "hint": "Повышенная чувствительность к свету — признак мигрени.",
        },
        {
            "feature_name": "onset",
            "question_text": "Как началась боль?",
            "type": "single_choice",
            "options": ["Постепенно нарастала", "Возникла резко (как удар)", "Была всегда"],
            "hint": "Резкое начало — повод немедленно обратиться к врачу.",
        },
    ],
    "abdomen": [
        {
            "feature_name": "pain_location",
            "question_text": "В какой части живота болит?",
            "type": "single_choice",
            "options": ["Верхняя часть (под рёбрами)", "Нижняя часть", "Правая сторона", "Левая сторона", "По всему животу"],
            "hint": None,
        },
        {
            "feature_name": "pain_character",
            "question_text": "Как бы вы описали боль?",
            "type": "single_choice",
            "options": ["Схваткообразная (волнами)", "Постоянная / ноющая", "Острая / режущая", "Тяжесть / распирание"],
            "hint": None,
        },
        {
            "feature_name": "food_relation",
            "question_text": "Связана ли боль с приёмом пищи?",
            "type": "single_choice",
            "options": ["Усиливается после еды", "Проходит после еды", "Усиливается натощак", "Не связана с едой"],
            "hint": None,
        },
        {
            "feature_name": "fever",
            "question_text": "Есть ли повышенная температура?",
            "type": "single_choice",
            "options": ["Нет", "До 37.5°C", "37.5–38.5°C", "Выше 38.5°C"],
            "hint": None,
        },
    ],
    "throat": [
        {
            "feature_name": "fever",
            "question_text": "Какая у вас температура?",
            "type": "single_choice",
            "options": ["Нормальная (до 37°C)", "Субфебрильная (37–37.5°C)", "38–39°C", "Выше 39°C"],
            "hint": None,
        },
        {
            "feature_name": "cough_type",
            "question_text": "Есть ли кашель?",
            "type": "single_choice",
            "options": ["Нет кашля", "Сухой кашель", "Кашель с мокротой", "Лающий кашель"],
            "hint": None,
        },
        {
            "feature_name": "throat_pain",
            "question_text": "Есть ли боль в горле?",
            "type": "single_choice",
            "options": ["Да, сильная — больно глотать", "Умеренная", "Нет"],
            "hint": None,
        },
        {
            "feature_name": "nasal_congestion",
            "question_text": "Есть ли насморк или заложенность носа?",
            "type": "single_choice",
            "options": ["Да, выделения", "Заложен, без выделений", "Нет"],
            "hint": None,
        },
    ],
    "back": [
        {
            "feature_name": "pain_location",
            "question_text": "Где именно болит?",
            "type": "single_choice",
            "options": ["Шея", "Верхняя часть спины (между лопатками)", "Поясница", "По всей спине"],
            "hint": None,
        },
        {
            "feature_name": "pain_character",
            "question_text": "Как бы вы описали боль?",
            "type": "single_choice",
            "options": ["Острая / стреляющая", "Ноющая / тупая", "Жгучая", "Скованность / напряжение"],
            "hint": None,
        },
        {
            "feature_name": "radiation",
            "question_text": "Отдаёт ли боль куда-то?",
            "type": "single_choice",
            "options": ["В ногу (по задней поверхности)", "В руку", "Не отдаёт"],
            "hint": "Боль в ноге при проблемах со спиной — признак защемления нерва.",
        },
        {
            "feature_name": "movement_relation",
            "question_text": "Как боль связана с движением?",
            "type": "single_choice",
            "options": ["Усиливается при движении", "Усиливается в покое", "Не зависит от движения"],
            "hint": None,
        },
    ],
    "limbs": [
        {
            "feature_name": "pain_location",
            "question_text": "Где именно болит?",
            "type": "single_choice",
            "options": ["Плечо", "Локоть / запястье / кисть", "Бедро / колено", "Стопа / голеностоп", "Несколько мест"],
            "hint": None,
        },
        {
            "feature_name": "swelling",
            "question_text": "Есть ли отёк или покраснение в этом месте?",
            "type": "single_choice",
            "options": ["Да, заметный отёк", "Небольшое покраснение", "Нет"],
            "hint": None,
        },
        {
            "feature_name": "trauma",
            "question_text": "Был ли ушиб, травма или непривычная нагрузка незадолго до этого?",
            "type": "single_choice",
            "options": ["Да, была травма", "Да, сильная нагрузка", "Нет"],
            "hint": None,
        },
        {
            "feature_name": "movement_limit",
            "question_text": "Ограничено ли движение в поражённой области?",
            "type": "single_choice",
            "options": ["Да, сильно — почти не двигается", "Немного ограничено", "Нет"],
            "hint": None,
        },
    ],
    "skin": [
        {
            "feature_name": "skin_symptom",
            "question_text": "Что именно вас беспокоит на коже?",
            "type": "single_choice",
            "options": ["Зуд без высыпаний", "Красные пятна / сыпь", "Отёк", "Сухость / шелушение", "Другое"],
            "hint": None,
        },
        {
            "feature_name": "spread",
            "question_text": "Как распространяются симптомы?",
            "type": "single_choice",
            "options": ["Только одно место", "Несколько мест", "По всему телу"],
            "hint": None,
        },
        {
            "feature_name": "duration_days",
            "question_text": "Как давно появились симптомы?",
            "type": "single_choice",
            "options": ["Сегодня", "1–3 дня", "4–7 дней", "Больше недели"],
            "hint": None,
        },
        {
            "feature_name": "trigger",
            "question_text": "Связываете ли вы это с чем-то?",
            "type": "single_choice",
            "options": ["Да, после контакта с чем-то", "Да, после еды", "Да, после стресса", "Не связываю"],
            "hint": None,
        },
    ],
    "general": [
        {
            "feature_name": "pain_character",
            "question_text": "Как вы бы описали ваши ощущения?",
            "type": "single_choice",
            "options": ["Боль", "Слабость / усталость", "Головокружение", "Дискомфорт", "Другое"],
            "hint": None,
        },
        {
            "feature_name": "fever",
            "question_text": "Есть ли повышенная температура?",
            "type": "single_choice",
            "options": ["Нет", "До 37.5°C", "37.5–38.5°C", "Выше 38.5°C"],
            "hint": None,
        },
        {
            "feature_name": "associated_symptoms",
            "question_text": "Есть ли другие симптомы?",
            "type": "single_choice",
            "options": ["Тошнота", "Слабость", "Одышка", "Нет других симптомов"],
            "hint": None,
        },
    ],
}


def get_questions_for_area(area: str) -> list[dict[str, Any]]:
    """Return ordered question list: common questions first, then area-specific."""
    return _COMMON_QUESTIONS + _AREA_QUESTIONS.get(area, _AREA_QUESTIONS["general"])
