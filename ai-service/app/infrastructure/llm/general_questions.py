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
        r"\bживот", r"\bжелудо", r"\bкишечник", r"\bтошн", r"\bрвот",
        r"\bвздути", r"\bдиаре", r"\bпонос", r"\bзапор",
        r"\bпечен", r"\bподреберь", r"\bстул",
    ]),
    ("throat", [
        r"\bгорло", r"\bкашел", r"\bнасморк", r"\bпростуд", r"\bгрипп",
        r"\bтемператур", r"\bжар\b", r"\bлихорадк", r"\bтонзилл",
        r"\bнос\b", r"\bнасмор", r"\bорви", r"\bорз",
    ]),
    ("back", [
        r"\bспин", r"\bпоясниц", r"\bпозвоноч", r"\bшея\b", r"\bшее\b",
        r"\bшейн", r"\bмежпозвон",
    ]),
    ("limbs", [
        r"\bрук(?:[аиуе]|ой)\b", r"\bног(?:[аиуе]|ой)\b",
        r"\bплечо?\b", r"\bплеч", r"\bлокот", r"\bколен", r"\bголеност",
        r"\bсустав", r"\bмышц", r"\bзапясть", r"\bбедр", r"\bстоп",
    ]),
    ("skin", [
        r"\bкожа", r"\bкожн", r"\bсыпь", r"\bзуд\b", r"\bзудит",
        r"\bкрасн", r"\bпятн[оа]", r"\bвысыпан", r"\bаллерги",
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
            "options": [
                "Пульсирующая / стучит в висках",
                "Давящая / сжимающая (как обруч)",
                "Острая / стреляющая",
                "Тупая / ноющая",
            ],
            "hint": "Пульсирующая боль чаще встречается при мигрени; сжимающая — при головной боли напряжения.",
        },
        {
            "feature_name": "associated_nausea",
            "question_text": "Есть ли тошнота или рвота во время боли?",
            "type": "single_choice",
            "options": ["Да, тошнота", "Да, была рвота", "Нет"],
            "hint": None,
        },
        {
            "feature_name": "photophobia",
            "question_text": "Беспокоит ли яркий свет или громкие звуки во время приступа?",
            "type": "single_choice",
            "options": ["Да, очень раздражает", "Немного", "Нет"],
            "hint": "Светобоязнь и звукобоязнь — типичные признаки мигрени.",
        },
        {
            "feature_name": "onset",
            "question_text": "Как началась боль?",
            "type": "single_choice",
            "options": [
                "Постепенно нарастала в течение часов",
                "Возникла резко (как удар грома)",
                "Хроническая — беспокоит уже долго",
            ],
            "hint": "Внезапное начало — повод исключить серьёзные причины.",
        },
        {
            "feature_name": "trigger",
            "question_text": "С чем вы связываете появление боли?",
            "type": "single_choice",
            "options": [
                "Стресс / переутомление",
                "Недосып или избыток сна",
                "После физической нагрузки",
                "Изменение погоды",
                "Не могу определить",
            ],
            "hint": None,
        },
    ],
    "abdomen": [
        {
            "feature_name": "pain_location",
            "question_text": "В какой части живота болит?",
            "type": "single_choice",
            "options": [
                "Верхняя часть (под рёбрами / эпигастрий)",
                "Правое подреберье",
                "Околопупочная область",
                "Внизу живота справа",
                "Внизу живота слева",
                "По всему животу",
            ],
            "hint": None,
        },
        {
            "feature_name": "pain_character",
            "question_text": "Как бы вы описали боль?",
            "type": "single_choice",
            "options": [
                "Схваткообразная (волнами усиливается)",
                "Постоянная / ноющая",
                "Острая / режущая",
                "Тяжесть / распирание",
                "Жжение",
            ],
            "hint": None,
        },
        {
            "feature_name": "food_relation",
            "question_text": "Связана ли боль с приёмом пищи?",
            "type": "single_choice",
            "options": [
                "Усиливается через 30–60 мин после еды",
                "Проходит после еды",
                "Усиливается натощак / ночью",
                "Появляется после жирной/острой пищи",
                "Не связана с едой",
            ],
            "hint": None,
        },
        {
            "feature_name": "bowel_changes",
            "question_text": "Изменился ли стул?",
            "type": "single_choice",
            "options": [
                "Понос (диарея)",
                "Запор",
                "Чередуется понос и запор",
                "В стуле кровь или чёрный цвет",
                "Без изменений",
            ],
            "hint": "Кровь в стуле или чёрный стул — повод срочно показаться врачу.",
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
            "feature_name": "throat_pain",
            "question_text": "Есть ли боль в горле?",
            "type": "single_choice",
            "options": [
                "Да, очень сильная — больно глотать даже воду",
                "Умеренная — больно глотать твёрдую пищу",
                "Першит / царапает",
                "Нет",
            ],
            "hint": None,
        },
        {
            "feature_name": "cough_type",
            "question_text": "Есть ли кашель?",
            "type": "single_choice",
            "options": [
                "Нет кашля",
                "Сухой кашель",
                "Кашель с прозрачной мокротой",
                "Кашель с жёлто-зелёной мокротой",
                "Лающий кашель",
            ],
            "hint": None,
        },
        {
            "feature_name": "nasal_congestion",
            "question_text": "Есть ли насморк или заложенность носа?",
            "type": "single_choice",
            "options": ["Да, прозрачные выделения", "Да, густые жёлто-зелёные", "Заложен без выделений", "Нет"],
            "hint": None,
        },
        {
            "feature_name": "associated_symptoms",
            "question_text": "Есть ли другие симптомы?",
            "type": "single_choice",
            "options": [
                "Слабость и ломота во всём теле",
                "Одышка / тяжесть при дыхании",
                "Боль в груди при кашле",
                "Только горло / нос",
            ],
            "hint": "Одышка или боль в груди при ОРВИ — повод срочно показаться врачу.",
        },
    ],
    "back": [
        {
            "feature_name": "pain_location",
            "question_text": "Где именно болит?",
            "type": "single_choice",
            "options": [
                "Шея",
                "Между лопатками",
                "Поясница",
                "Крестец / копчик",
                "По всей спине",
            ],
            "hint": None,
        },
        {
            "feature_name": "pain_character",
            "question_text": "Как бы вы описали боль?",
            "type": "single_choice",
            "options": [
                "Острая / стреляющая (прострел)",
                "Ноющая / тупая",
                "Жгучая",
                "Скованность / напряжение мышц",
            ],
            "hint": None,
        },
        {
            "feature_name": "radiation",
            "question_text": "Отдаёт ли боль куда-то?",
            "type": "single_choice",
            "options": [
                "В ногу по задней поверхности (до стопы)",
                "В руку или плечо",
                "В ягодицу / пах",
                "Не отдаёт никуда",
            ],
            "hint": "Боль, отдающая в ногу до стопы, — признак защемления седалищного нерва.",
        },
        {
            "feature_name": "movement_relation",
            "question_text": "Как боль связана с движением?",
            "type": "single_choice",
            "options": [
                "Усиливается при движении / наклонах",
                "Усиливается в покое (ночью)",
                "При сидении / стоянии",
                "Не зависит от положения",
            ],
            "hint": None,
        },
        {
            "feature_name": "trauma",
            "question_text": "Что предшествовало боли?",
            "type": "single_choice",
            "options": [
                "Поднятие тяжести",
                "Травма / падение",
                "Долгое сидение / неудобная поза",
                "Переохлаждение",
                "Появилась без причины",
            ],
            "hint": None,
        },
    ],
    "limbs": [
        {
            "feature_name": "pain_location",
            "question_text": "Где именно болит?",
            "type": "single_choice",
            "options": [
                "Плечо",
                "Локоть / запястье / кисть",
                "Бедро / тазобедренный сустав",
                "Колено",
                "Стопа / голеностоп",
                "Несколько мест одновременно",
            ],
            "hint": None,
        },
        {
            "feature_name": "trauma",
            "question_text": "Был ли ушиб, травма или непривычная нагрузка?",
            "type": "single_choice",
            "options": [
                "Да, недавняя травма (падение, удар)",
                "Да, перегрузка / непривычная нагрузка",
                "Нет, появилось само",
            ],
            "hint": "При травме с резкой деформацией или невозможностью наступать — нужен срочный осмотр травматолога.",
        },
        {
            "feature_name": "swelling",
            "question_text": "Есть ли отёк, покраснение или повышение температуры в этом месте?",
            "type": "single_choice",
            "options": [
                "Да, заметный отёк и покраснение",
                "Только отёк",
                "Только покраснение",
                "Нет",
            ],
            "hint": "Сильный отёк с покраснением и жаром в одном суставе — может быть инфекцией.",
        },
        {
            "feature_name": "movement_limit",
            "question_text": "Ограничено ли движение в поражённой области?",
            "type": "single_choice",
            "options": [
                "Да, не могу опираться / поднимать",
                "Немного ограничено",
                "Нет",
            ],
            "hint": None,
        },
        {
            "feature_name": "associated_symptoms",
            "question_text": "Есть ли скованность по утрам, особенно в нескольких суставах?",
            "type": "single_choice",
            "options": [
                "Да, более 30 минут",
                "Меньше 30 минут",
                "Нет утренней скованности",
            ],
            "hint": "Длительная утренняя скованность — признак воспалительного артрита.",
        },
    ],
    "skin": [
        {
            "feature_name": "skin_symptom",
            "question_text": "Что именно вас беспокоит на коже?",
            "type": "single_choice",
            "options": [
                "Зуд без видимых высыпаний",
                "Красные пятна / сыпь",
                "Пузырьки или волдыри",
                "Отёк",
                "Сухость / шелушение",
                "Гнойнички",
            ],
            "hint": None,
        },
        {
            "feature_name": "spread",
            "question_text": "Как распространены симптомы?",
            "type": "single_choice",
            "options": [
                "Одно место",
                "Несколько мест в одной области",
                "По всему телу",
            ],
            "hint": None,
        },
        {
            "feature_name": "trigger",
            "question_text": "Связываете ли вы это с чем-то?",
            "type": "single_choice",
            "options": [
                "Контакт (косметика, бытовая химия, растения)",
                "Новое лекарство",
                "Еда (новые продукты)",
                "Стресс",
                "Не связываю",
            ],
            "hint": None,
        },
        {
            "feature_name": "associated_symptoms",
            "question_text": "Есть ли общие симптомы помимо кожи?",
            "type": "single_choice",
            "options": [
                "Затруднение дыхания / отёк лица",
                "Температура / слабость",
                "Боль в суставах",
                "Только кожа",
            ],
            "hint": "Отёк лица или затруднённое дыхание — признак тяжёлой аллергии. Срочно вызывайте 103.",
        },
    ],
    "general": [
        {
            "feature_name": "pain_character",
            "question_text": "Как бы вы описали ваши ощущения?",
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
            "options": ["Тошнота", "Слабость", "Одышка", "Головокружение", "Нет других симптомов"],
            "hint": None,
        },
    ],
}


def get_questions_for_area(area: str) -> list[dict[str, Any]]:
    """Return ordered question list: common questions first, then area-specific."""
    return _COMMON_QUESTIONS + _AREA_QUESTIONS.get(area, _AREA_QUESTIONS["general"])
