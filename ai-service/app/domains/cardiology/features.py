CARDIOLOGY_FEATURES = [
    "age",
    "sex",
    "chest_pain_type",
    "resting_blood_pressure",
    "cholesterol",
    "fasting_blood_sugar",
    "resting_ecg",
    "max_heart_rate",
    "exercise_angina",
    "oldpeak",
    "st_slope",
]

# Feature priority ordered by typical XGBoost importance in cardiology models
FEATURE_PRIORITY = [
    "chest_pain_type",
    "st_slope",
    "exercise_angina",
    "oldpeak",
    "max_heart_rate",
    "age",
    "sex",
    "resting_blood_pressure",
    "cholesterol",
    "fasting_blood_sugar",
    "resting_ecg",
]

# Human-readable descriptions for LLM context
FEATURE_DESCRIPTIONS = {
    "age": "возраст пациента",
    "sex": "пол (0=женский, 1=мужской)",
    "chest_pain_type": "тип боли в груди (0=бессимптомно, 1=атипичная стенокардия, 2=неангинозная боль, 3=типичная стенокардия)",
    "resting_blood_pressure": "артериальное давление в покое (мм рт.ст.)",
    "cholesterol": "уровень холестерина (мг/дл)",
    "fasting_blood_sugar": "сахар натощак > 120 мг/дл (0=нет, 1=да)",
    "resting_ecg": "ЭКГ в покое (0=норма, 1=аномалия ST-T, 2=гипертрофия ЛЖ)",
    "max_heart_rate": "максимальная ЧСС при нагрузке (уд/мин)",
    "exercise_angina": "стенокардия при нагрузке (0=нет, 1=да)",
    "oldpeak": "депрессия ST-сегмента при нагрузке (числовое значение)",
    "st_slope": "наклон ST на пике нагрузки (0=восходящий, 1=плоский, 2=нисходящий)",
}

MAX_QUESTIONS = 8
TOLERATED_MISSING_THRESHOLD = 2
CONFIDENCE_EARLY_STOP = 0.70
