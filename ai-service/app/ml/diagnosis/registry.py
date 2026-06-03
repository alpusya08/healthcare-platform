"""
Domain Diagnosis Registry.

Defines which medical domains (specialties) the platform supports for
ML-based diagnosis prediction, and lists candidate diagnoses per domain.

Each domain has:
  - code: stable specialization code (matches `specializations.code` in DB)
  - display_name_ru: human-readable Russian name
  - diagnoses: ordered list of diagnoses the ML model can predict
               (index in this list == class_id in the trained model)
  - model_name: MLflow registered model name

Design notes:
  * 5 initial domains cover ~80% of outpatient visits.
  * Each domain has 7-10 most common conditions (real-world prevalence based).
  * Class indices are FROZEN once a model is trained — appending new
    diagnoses is fine, reordering will break loaded models.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class DiagnosisInfo:
    code: str                # internal stable code (e.g. "mi_acute")
    name_ru: str             # short Russian name shown to doctor
    name_lay_ru: str         # patient-friendly explanation
    icd10: str | None = None # ICD-10 code (informational)


@dataclass(frozen=True)
class DomainConfig:
    code: str                            # matches specialization code
    display_name_ru: str
    model_name: str                      # MLflow model name
    diagnoses: list[DiagnosisInfo] = field(default_factory=list)

    @property
    def num_classes(self) -> int:
        return len(self.diagnoses)

    def class_id(self, dx_code: str) -> int | None:
        for i, d in enumerate(self.diagnoses):
            if d.code == dx_code:
                return i
        return None

    def diagnosis_by_id(self, class_id: int) -> DiagnosisInfo:
        return self.diagnoses[class_id]


# ────────────────────────────────────────────────────────────────────────────────
# Domain definitions
# ────────────────────────────────────────────────────────────────────────────────

CARDIOLOGY = DomainConfig(
    code="cardiology",
    display_name_ru="Кардиология",
    model_name="diagnosis-cardiology",
    diagnoses=[
        DiagnosisInfo("htn_essential",  "Артериальная гипертензия",
                      "Стойкое повышение артериального давления", "I10"),
        DiagnosisInfo("angina_stable",  "Стенокардия напряжения",
                      "Боль в груди при нагрузке из-за нехватки кровотока к сердцу", "I20.8"),
        DiagnosisInfo("mi_acute",       "Острый инфаркт миокарда",
                      "Острое нарушение кровоснабжения сердечной мышцы", "I21"),
        DiagnosisInfo("af_arrhythmia",  "Фибрилляция предсердий",
                      "Нерегулярный быстрый ритм сердца", "I48"),
        DiagnosisInfo("heart_failure",  "Хроническая сердечная недостаточность",
                      "Сердце не справляется с нагрузкой", "I50"),
        DiagnosisInfo("pericarditis",   "Перикардит",
                      "Воспаление оболочки сердца", "I30"),
        DiagnosisInfo("vsd_neuro",      "Вегетососудистая дистония",
                      "Функциональные жалобы со стороны сердца без органической патологии", "F45.3"),
    ],
)

GASTROENTEROLOGY = DomainConfig(
    code="gastroenterology",
    display_name_ru="Гастроэнтерология",
    model_name="diagnosis-gastroenterology",
    diagnoses=[
        DiagnosisInfo("gastritis",       "Гастрит",
                      "Воспаление слизистой желудка", "K29"),
        DiagnosisInfo("peptic_ulcer",    "Язвенная болезнь",
                      "Язва желудка или двенадцатиперстной кишки", "K27"),
        DiagnosisInfo("gerd",            "ГЭРБ (рефлюкс)",
                      "Заброс кислоты из желудка в пищевод", "K21"),
        DiagnosisInfo("ibs",             "Синдром раздражённого кишечника",
                      "Функциональное расстройство кишечника", "K58"),
        DiagnosisInfo("acute_gastroent", "Острый гастроэнтерит",
                      "Кишечная инфекция (вирусная или бактериальная)", "A09"),
        DiagnosisInfo("appendicitis",    "Острый аппендицит",
                      "Воспаление аппендикса — требует хирурга", "K35"),
        DiagnosisInfo("cholecystitis",   "Холецистит",
                      "Воспаление желчного пузыря", "K81"),
        DiagnosisInfo("constipation",    "Функциональный запор",
                      "Затруднённое опорожнение кишечника", "K59.0"),
    ],
)

NEUROLOGY = DomainConfig(
    code="neurology",
    display_name_ru="Неврология",
    model_name="diagnosis-neurology",
    diagnoses=[
        DiagnosisInfo("tension_headache", "Головная боль напряжения",
                      "Сжимающая головная боль на фоне переутомления", "G44.2"),
        DiagnosisInfo("migraine",         "Мигрень",
                      "Приступы пульсирующей головной боли", "G43"),
        DiagnosisInfo("stroke_ischemic",  "Ишемический инсульт",
                      "Острое нарушение кровообращения мозга", "I63"),
        DiagnosisInfo("tia",              "Транзиторная ишемическая атака",
                      "Преходящие неврологические симптомы — предвестник инсульта", "G45"),
        DiagnosisInfo("osteochondrosis",  "Остеохондроз / радикулопатия",
                      "Защемление нервных корешков позвоночника", "M54.1"),
        DiagnosisInfo("vertigo_bppv",     "Доброкачественное позиционное головокружение",
                      "Головокружение при изменении положения головы", "H81.1"),
        DiagnosisInfo("neuropathy",       "Невропатия",
                      "Поражение периферического нерва", "G62"),
        DiagnosisInfo("anxiety_somatic",  "Тревожное расстройство (соматизированное)",
                      "Неврологические жалобы на фоне стресса/тревоги", "F41"),
    ],
)

PULMONOLOGY = DomainConfig(
    code="pulmonology",
    display_name_ru="Пульмонология",
    model_name="diagnosis-pulmonology",
    diagnoses=[
        DiagnosisInfo("uri_viral",      "ОРВИ",
                      "Острая вирусная респираторная инфекция", "J06.9"),
        DiagnosisInfo("acute_bronchitis","Острый бронхит",
                      "Воспаление бронхов", "J20"),
        DiagnosisInfo("pneumonia",      "Пневмония",
                      "Воспаление лёгких", "J18"),
        DiagnosisInfo("asthma",         "Бронхиальная астма",
                      "Хроническое заболевание с приступами одышки", "J45"),
        DiagnosisInfo("copd",           "ХОБЛ",
                      "Хроническая обструктивная болезнь лёгких", "J44"),
        DiagnosisInfo("allergic_rhinitis","Аллергический ринит",
                      "Аллергическое воспаление слизистой носа", "J30"),
        DiagnosisInfo("pleurisy",       "Плеврит",
                      "Воспаление плевральной оболочки лёгких", "R09.1"),
    ],
)

DERMATOLOGY = DomainConfig(
    code="dermatology",
    display_name_ru="Дерматология",
    model_name="diagnosis-dermatology",
    diagnoses=[
        DiagnosisInfo("atopic_dermatitis","Атопический дерматит",
                      "Хроническое аллергическое воспаление кожи", "L20"),
        DiagnosisInfo("contact_dermatitis","Контактный дерматит",
                      "Реакция кожи на раздражитель или аллерген", "L25"),
        DiagnosisInfo("urticaria",       "Крапивница",
                      "Аллергическая сыпь с зудом", "L50"),
        DiagnosisInfo("acne",            "Акне (угревая болезнь)",
                      "Воспаление сальных желёз", "L70"),
        DiagnosisInfo("psoriasis",       "Псориаз",
                      "Хроническое аутоиммунное заболевание кожи", "L40"),
        DiagnosisInfo("fungal_skin",     "Грибковая инфекция кожи",
                      "Микоз — поражение кожи грибком", "B35"),
        DiagnosisInfo("eczema",          "Экзема",
                      "Воспалительное заболевание кожи с зудом и шелушением", "L30"),
    ],
)


# ────────────────────────────────────────────────────────────────────────────────
# Registry
# ────────────────────────────────────────────────────────────────────────────────

DOMAIN_REGISTRY: dict[str, DomainConfig] = {
    d.code: d for d in [
        CARDIOLOGY,
        GASTROENTEROLOGY,
        NEUROLOGY,
        PULMONOLOGY,
        DERMATOLOGY,
    ]
}


def get_domain(code: str) -> DomainConfig | None:
    """Return DomainConfig by specialization code, or None if not supported."""
    return DOMAIN_REGISTRY.get(code)


def supported_domain_codes() -> list[str]:
    return list(DOMAIN_REGISTRY.keys())


# ────────────────────────────────────────────────────────────────────────────────
# Extended diagnosis feature schema
# ────────────────────────────────────────────────────────────────────────────────

# Universal features (same 12 used by triage classifier — already extracted)
TRIAGE_FEATURES = [
    "age", "sex",
    "symptom_duration_days", "pain_severity",
    "onset_type", "is_worsening", "affects_daily_activity",
    "has_chronic_conditions", "takes_medications", "prior_similar_episode",
    "associated_symptoms_count", "red_flag_present",
]

# Additional features specifically useful for diagnosis classification.
# These are extracted by the LLM from the dialogue (same way triage features are).
# Encoded as integers: usually 0/1 flags, sometimes ordinal scales.
DIAGNOSIS_EXTRA_FEATURES = [
    # Anatomical localization (0/1 each — at least one should be 1 ideally)
    "loc_chest", "loc_abdomen", "loc_head", "loc_back",
    "loc_limbs", "loc_throat", "loc_skin", "loc_respiratory",
    # Pain character (ordinal: 0=none, 1=dull, 2=cramping, 3=burning, 4=sharp/stabbing, 5=pressing)
    "pain_character",
    # Common modifiers / associations
    "radiates",          # боль отдаёт куда-то
    "fever",             # температура
    "nausea_vomiting",   # тошнота/рвота
    "cough",             # кашель
    "shortness_of_breath",
    "palpitations",      # сердцебиение/перебои
    "dizziness",
    "rash",              # сыпь
    "itching",           # зуд
    "swelling",          # отёк
    # Modifying factors
    "worse_on_exertion",   # ухудшение при нагрузке
    "worse_after_eating",  # ухудшение после еды
    "relieved_by_rest",    # облегчение в покое
    # Lifestyle / risk
    "smoking",
    "alcohol_use",
    "family_history_similar",
]

# Full feature set for diagnosis models (triage + extras)
ALL_DIAGNOSIS_FEATURES = TRIAGE_FEATURES + DIAGNOSIS_EXTRA_FEATURES
