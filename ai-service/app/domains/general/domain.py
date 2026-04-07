from __future__ import annotations

import re
import uuid
from typing import Optional

import structlog

from app.core.entities.analysis_session import AnalysisSession
from app.core.entities.diagnosis import Diagnosis
from app.core.entities.medical_features import MedicalFeatures
from app.core.entities.question import Question
from app.core.enums import QuestionType, TriageLevel
from app.core.interfaces.domain_strategy import MedicalDomain
from app.core.interfaces.llm_provider import LLMProvider
from app.infrastructure.llm.general_questions import (
    AREA_DISPLAY_NAMES,
    detect_general_area,
    get_questions_for_area,
)

logger = structlog.get_logger()

MAX_QUESTIONS = 6

GENERAL_FEATURES = [
    "duration_days",
    "pain_severity",
    "pain_character",
    "pain_location",
    "associated_symptoms",
    "fever",
    "food_relation",
    "radiation",
    "movement_relation",
    "swelling",
    "trauma",
    "movement_limit",
    "cough_type",
    "throat_pain",
    "nasal_congestion",
    "onset",
    "photophobia",
    "associated_nausea",
    "spread",
    "trigger",
    "skin_symptom",
    "symptom_area",
]

# Emergency keyword patterns for non-cardiac complaints
_EMERGENCY_PATTERNS = [
    (r"внезапн.{0,20}сильн.{0,20}голов", "Внезапная сильная головная боль — возможен инсульт или разрыв аневризмы. Немедленно вызовите скорую — 103"),
    (r"онемени.{0,20}(рук|ног|лиц|половин)", "Онемение конечностей или лица — возможен инсульт. Немедленно вызовите скорую — 103"),
    (r"(не могу говорить|речь нарушена|перекосило лицо)", "Нарушение речи или асимметрия лица — признак инсульта. Немедленно вызовите скорую — 103"),
    (r"(сильна.{0,10}боль в животе|острый живот|живот как доска)", "Острая боль в животе — возможна хирургическая патология. Немедленно обратитесь в скорую — 103"),
    (r"(температур.{0,10}(40|41|42)|жар.{0,10}(40|41))", "Очень высокая температура — обратитесь к врачу немедленно"),
    (r"(потер.{0,10}сознани|упал в обморок)", "Потеря сознания — требует немедленной медицинской помощи. Вызовите скорую — 103"),
]


class GeneralSymptomDomain(MedicalDomain):
    """Universal symptom intake domain for non-cardiology complaints."""

    def __init__(self, llm: LLMProvider) -> None:
        self._llm = llm

    @property
    def code(self) -> str:
        return "general"

    @property
    def display_name(self) -> str:
        return "Общая симптоматика"

    @property
    def required_features(self) -> list[str]:
        return GENERAL_FEATURES

    async def extract_features(self, session: AnalysisSession) -> MedicalFeatures:
        area = detect_general_area(session.initial_description)

        asked_features: set[str] = set()
        answered: dict[str, str] = {}
        for q in session.questions:
            if q.feature_name:
                asked_features.add(q.feature_name)
            if q.feature_name and q.answer:
                answered[q.feature_name] = q.answer

        # Try to pull age from description text (used only for context, not a GENERAL_FEATURE)
        age: int | None = None
        age_match = re.search(r"\b(\d{1,3})\s*(?:лет|год|года)\b", session.initial_description, re.IGNORECASE)
        if age_match:
            age = int(age_match.group(1))

        values: dict = {f: None for f in GENERAL_FEATURES}
        values["symptom_area"] = area
        for feature, answer in answered.items():
            values[feature] = answer
        if age is not None:
            values["_age_from_description"] = age

        values["_raw_description"] = session.initial_description
        return MedicalFeatures(values=values)

    async def generate_next_question(
        self, session: AnalysisSession, partial_features: MedicalFeatures
    ) -> Optional[Question]:
        if session.questions_count >= MAX_QUESTIONS:
            return None

        area = partial_features.get("symptom_area") or detect_general_area(session.initial_description)
        questions = get_questions_for_area(area)

        asked_feature_names: set[str] = {
            q.feature_name for q in session.questions if q.feature_name
        }

        for q_def in questions:
            fname = q_def["feature_name"]
            if fname not in asked_feature_names:
                q_type = QuestionType(q_def["type"])
                return Question(
                    id=uuid.uuid4(),
                    session_id=session.id,
                    question_text=q_def["question_text"],
                    question_type=q_type,
                    options=q_def.get("options"),
                    feature_name=fname,
                    hint=q_def.get("hint"),
                    order_index=session.questions_count,
                )

        return None

    async def check_emergency(self, features: MedicalFeatures) -> Optional[str]:
        desc = (features.get("_raw_description") or "").lower()
        for pattern, message in _EMERGENCY_PATTERNS:
            if re.search(pattern, desc, re.IGNORECASE):
                return message
        return None

    async def predict(self, features: MedicalFeatures) -> Diagnosis:
        area = features.get("symptom_area") or "general"
        area_name = AREA_DISPLAY_NAMES.get(area, "симптомы")
        severity_raw = features.get("pain_severity") or ""
        duration_raw = features.get("duration_days") or ""
        description = features.get("_raw_description") or ""

        is_severe = any(w in str(severity_raw).lower() for w in ["7–8", "9–10", "сильн", "невынос"])
        is_long = any(w in str(duration_raw).lower() for w in ["больше недели", "больше месяца"])

        explanation = self._build_general_explanation(area, area_name, severity_raw, duration_raw, description, is_severe)
        recommendations = self._build_recommendations(area, is_severe, is_long)

        triage = TriageLevel.URGENT if is_severe else TriageLevel.ROUTINE

        return Diagnosis(
            domain=self.code,
            primary_diagnosis=f"Жалобы на {area_name}",
            confidence=0.0,
            explanation=explanation,
            recommendations=recommendations,
            triage_level=triage,
            model_version="general-rule-based-v1",
            recommended_specialization=self._specialization_for_area(area),
        )

    def get_model_version(self) -> str:
        return "general-rule-based-v1"

    def _build_general_explanation(
        self, area: str, area_name: str, severity: str, duration: str, description: str, is_severe: bool
    ) -> str:
        severity_text = f"интенсивность: {severity}" if severity else "интенсивность не указана"
        duration_text = f"длительность: {duration}" if duration else "длительность не указана"

        area_advice = {
            "head": (
                "Головная боль — один из самых распространённых симптомов. "
                "Большинство случаев связано с напряжением, стрессом или недосыпанием. "
                "Однако регулярные или очень интенсивные боли требуют консультации невролога."
            ),
            "abdomen": (
                "Боль в животе может быть вызвана широким спектром причин: "
                "от функциональных расстройств (синдром раздражённого кишечника, гастрит) "
                "до состояний, требующих лечения (аппендицит, панкреатит). "
                "Точный диагноз устанавливается только после осмотра и анализов."
            ),
            "throat": (
                "Симптомы простуды или ангины чаще всего вызваны вирусами или бактериями. "
                "Большинство ОРВИ проходят самостоятельно за 5–7 дней. "
                "При высокой температуре, сильной боли в горле или ухудшении состояния нужна консультация врача."
            ),
            "back": (
                "Боль в спине — частая жалоба, в большинстве случаев связанная с мышечным напряжением "
                "или остеохондрозом. Однако боль, отдающая в ногу, или онемение требуют осмотра невролога."
            ),
            "limbs": (
                "Боль в суставах или мышцах может быть результатом травмы, воспаления или артроза. "
                "Для точной диагностики необходим осмотр травматолога или ревматолога."
            ),
        }.get(area, "Ваши симптомы требуют профессиональной медицинской оценки.")

        severity_comment = (
            "\n\nИнтенсивность жалоб высокая — рекомендуем не откладывать визит к врачу."
            if is_severe
            else ""
        )

        return (
            f"На основе описания ваших симптомов ({area_name}, {severity_text}, {duration_text}) "
            f"проведена предварительная оценка.\n\n"
            f"{area_advice}"
            f"{severity_comment}\n\n"
            "Важно: данная оценка носит информационный характер и не является диагнозом. "
            "Для точного диагноза необходим очный осмотр врача и при необходимости — анализы."
        )

    @staticmethod
    def _specialization_for_area(area: str) -> str:
        return {
            "head": "neurology",
            "back": "neurology",
            "abdomen": "therapy",
            "throat": "therapy",
            "limbs": "therapy",
            "skin": "dermatology",
        }.get(area, "therapy")

    def _build_recommendations(self, area: str, is_severe: bool, is_long: bool) -> list[str]:
        specialist = {
            "head": "неврологу",
            "abdomen": "терапевту или гастроэнтерологу",
            "throat": "терапевту или ЛОР-врачу",
            "back": "неврологу или ортопеду",
            "limbs": "травматологу или ревматологу",
            "skin": "дерматологу",
        }.get(area, "терапевту")

        recs = [f"Запишитесь на консультацию к {specialist}"]
        if is_severe:
            recs.insert(0, "Не откладывайте визит к врачу — симптомы выражены сильно")
        if is_long:
            recs.append("Длительные симптомы требуют обследования — сдайте общий анализ крови")
        recs.append("Если состояние резко ухудшится — вызовите скорую помощь: 103")
        return recs
