from __future__ import annotations

import json
import re
import uuid
from typing import Any, Optional

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
    "duration_days", "pain_severity", "pain_character", "pain_location",
    "associated_symptoms", "fever", "food_relation", "radiation",
    "movement_relation", "swelling", "trauma", "movement_limit",
    "cough_type", "throat_pain", "nasal_congestion", "onset",
    "photophobia", "associated_nausea", "spread", "trigger",
    "skin_symptom", "symptom_area",
]

_EMERGENCY_PATTERNS = [
    (r"внезапн.{0,20}сильн.{0,20}голов", "Внезапная сильная головная боль — возможен инсульт или разрыв аневризмы. Немедленно вызовите скорую — 103"),
    (r"онемени.{0,20}(рук|ног|лиц|половин)", "Онемение конечностей или лица — возможен инсульт. Немедленно вызовите скорую — 103"),
    (r"(не могу говорить|речь нарушена|перекосило лицо)", "Нарушение речи или асимметрия лица — признак инсульта. Немедленно вызовите скорую — 103"),
    (r"(сильна.{0,10}боль в животе|острый живот|живот как доска)", "Острая боль в животе — возможна хирургическая патология. Немедленно обратитесь в скорую — 103"),
    (r"(температур.{0,10}(40|41|42)|жар.{0,10}(40|41))", "Очень высокая температура — обратитесь к врачу немедленно"),
    (r"(потер.{0,10}сознани|упал в обморок)", "Потеря сознания — требует немедленной медицинской помощи. Вызовите скорую — 103"),
]

_QUESTION_SYSTEM_PROMPT = """\
You are a medical AI assistant conducting a symptom intake interview. Your job is to ask ONE clarifying question to the patient.

Rules:
- Ask exactly one question per turn
- Questions must be in RUSSIAN (the patient speaks Russian)
- Use a warm, conversational tone — not like a form
- Focus on what is most clinically relevant given the specific complaint
- Never repeat information already provided
- Never suggest a diagnosis

If you already have enough information to proceed (4+ answered questions), return: {"done": true}

Otherwise return JSON:
{"question_text": "question in Russian", "question_type": "choice", "options": ["option1", "option2", "option3"], "feature_name": "feature_key", "hint": "brief hint in Russian or null"}

question_type: "text" for open-ended, "choice" when specific options make sense (preferred for medical intake).
feature_name must be one of: duration_days, pain_severity, pain_character, pain_location, associated_symptoms, fever, food_relation, radiation, movement_relation, swelling, trauma, onset, photophobia, associated_nausea, trigger, cough_type, throat_pain, nasal_congestion, skin_symptom, spread
"""

_REPORT_SYSTEM_PROMPT = """\
You are an experienced general practitioner. Based on the patient's reported symptoms, produce a brief clinical assessment.

All output fields must be in RUSSIAN. Return a single JSON object:
{"primary_diagnosis":"1-sentence working diagnosis in Russian","summary":"1-2 sentence summary in Russian","explanation":"2-3 sentence explanation in Russian ending with: Важно: данная оценка носит информационный характер и не является диагнозом.","possible_causes":["cause1","cause2","cause3"],"red_flags":[],"recommendations":["rec1","rec2","rec3"],"triage_level":"ROUTINE","recommended_specialization":"therapy","confidence":0.6}

triage_level: EMERGENCY (call ambulance now) / URGENT (see doctor today) / ROUTINE (schedule appointment).
recommended_specialization — use ONLY one of these exact codes: therapy, neurology, cardiology, dermatology, endocrinology, gastroenterology, orthopedics, surgery, pulmonology, otolaryngology.
confidence: 0.0–1.0 reflecting how certain the assessment is given available data.
red_flags: list serious warning signs if any, empty array otherwise.
"""


class GeneralSymptomDomain(MedicalDomain):
    """Universal symptom intake domain using LLM for dynamic Q&A and personalized reports."""

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
        answered: dict[str, str] = {
            q.feature_name: q.answer
            for q in session.questions
            if q.feature_name and q.answer
        }
        age_match = re.search(r"\b(\d{1,3})\s*(?:лет|год|года)\b", session.initial_description, re.IGNORECASE)

        values: dict[str, Any] = {f: None for f in GENERAL_FEATURES}
        values["symptom_area"] = area
        values.update(answered)
        values["_raw_description"] = session.initial_description
        if age_match:
            values["_age_from_description"] = int(age_match.group(1))
        if hasattr(session, "file_summaries") and session.file_summaries:
            values["_file_summaries"] = session.file_summaries

        return MedicalFeatures(values=values)

    async def generate_next_question(
        self, session: AnalysisSession, partial_features: MedicalFeatures
    ) -> Optional[Question]:
        if session.questions_count >= MAX_QUESTIONS:
            return None
        try:
            return await self._llm_next_question(session, partial_features)
        except Exception:
            return self._fallback_question(session, partial_features)

    async def check_emergency(self, features: MedicalFeatures) -> Optional[str]:
        desc = (features.get("_raw_description") or "").lower()
        for pattern, message in _EMERGENCY_PATTERNS:
            if re.search(pattern, desc, re.IGNORECASE):
                return message
        return None

    async def predict(self, features: MedicalFeatures) -> Diagnosis:
        try:
            return await self._llm_predict(features)
        except Exception:
            return self._smart_diagnosis(features)

    def get_model_version(self) -> str:
        return "general-llm-v1"

    async def _llm_next_question(
        self, session: AnalysisSession, partial_features: MedicalFeatures
    ) -> Optional[Question]:
        prompt = self._build_question_prompt(session, partial_features)
        raw = await self._llm.complete_structured(prompt, {})

        if raw.get("done"):
            return None

        feature_name = raw.get("feature_name", f"llm_q_{session.questions_count}")
        asked = {q.feature_name for q in session.questions if q.feature_name}
        if feature_name in asked:
            return self._fallback_question(session, partial_features)

        q_type_str = raw.get("question_type", "text")
        try:
            q_type = QuestionType(q_type_str)
        except ValueError:
            q_type = QuestionType.TEXT

        return Question(
            id=uuid.uuid4(),
            session_id=session.id,
            question_text=raw["question_text"],
            question_type=q_type,
            options=raw.get("options"),
            feature_name=feature_name,
            hint=raw.get("hint"),
            order_index=session.questions_count,
        )

    async def _llm_predict(self, features: MedicalFeatures) -> Diagnosis:
        prompt = self._build_report_prompt(features)
        raw = await self._llm.complete_structured(prompt, {})

        triage_map = {
            "EMERGENCY": TriageLevel.EMERGENCY,
            "URGENT": TriageLevel.URGENT,
            "ROUTINE": TriageLevel.ROUTINE,
        }
        triage = triage_map.get(str(raw.get("triage_level", "ROUTINE")).upper(), TriageLevel.ROUTINE)

        return Diagnosis(
            domain=self.code,
            primary_diagnosis=raw.get("primary_diagnosis", "Жалобы требуют уточнения"),
            confidence=float(raw.get("confidence", 0.0)),
            explanation=raw.get("explanation", ""),
            recommendations=raw.get("recommendations", []),
            triage_level=triage,
            model_version=self.get_model_version(),
            recommended_specialization=raw.get("recommended_specialization", "therapy"),
            possible_causes=raw.get("possible_causes", []),
            red_flags=raw.get("red_flags", []),
            summary=raw.get("summary", ""),
        )

    def _build_question_prompt(
        self, session: AnalysisSession, partial_features: MedicalFeatures
    ) -> str:
        lines = [
            _QUESTION_SYSTEM_PROMPT,
            f"\n--- PATIENT COMPLAINT ---\n{session.initial_description}",
        ]

        file_summaries = partial_features.get("_file_summaries")
        if file_summaries:
            lines.append("\n--- UPLOADED DOCUMENTS ---")
            for fs in (file_summaries if isinstance(file_summaries, list) else [file_summaries]):
                lines.append(str(fs))

        if session.questions:
            lines.append("\n--- Q&A SO FAR ---")
            for q in session.questions:
                if q.answer:
                    lines.append(f"Q: {q.question_text}")
                    lines.append(f"A: {q.answer}")

        asked = {q.feature_name for q in session.questions if q.feature_name}
        if asked:
            lines.append(f"\nAlready collected features: {', '.join(asked)}")

        lines.append(f"\nQuestions asked so far: {session.questions_count}/{MAX_QUESTIONS}")
        lines.append("\nNow generate the next most useful question, or {\"done\": true} if enough info.")
        return "\n".join(lines)

    def _build_report_prompt(self, features: MedicalFeatures) -> str:
        lines = [_REPORT_SYSTEM_PROMPT, "\n--- PATIENT INTAKE ---"]
        lines.append(f"Chief complaint: {features.get('_raw_description', '')}")

        file_summaries = features.get("_file_summaries")
        if file_summaries:
            lines.append("\n--- MEDICAL DOCUMENTS PROVIDED ---")
            for fs in (file_summaries if isinstance(file_summaries, list) else [file_summaries]):
                lines.append(str(fs))

        answered = {
            k: v for k, v in features.values.items()
            if v is not None and not k.startswith("_")
        }
        if answered:
            lines.append("\n--- SYMPTOM DETAILS ---")
            for k, v in answered.items():
                lines.append(f"  {k}: {v}")

        lines.append("\nGenerate the clinical assessment JSON now.")
        return "\n".join(lines)

    def _fallback_question(
        self, session: AnalysisSession, partial_features: MedicalFeatures
    ) -> Optional[Question]:
        area = partial_features.get("symptom_area") or detect_general_area(session.initial_description)
        questions = get_questions_for_area(area)
        asked = {q.feature_name for q in session.questions if q.feature_name}

        for q_def in questions:
            if q_def["feature_name"] not in asked:
                return Question(
                    id=uuid.uuid4(),
                    session_id=session.id,
                    question_text=q_def["question_text"],
                    question_type=QuestionType(q_def["type"]),
                    options=q_def.get("options"),
                    feature_name=q_def["feature_name"],
                    hint=q_def.get("hint"),
                    order_index=session.questions_count,
                )
        return None

    def _smart_diagnosis(self, features: MedicalFeatures) -> Diagnosis:
        area = features.get("symptom_area") or "general"
        area_name = AREA_DISPLAY_NAMES.get(area, "симптомы")
        desc = features.get("_raw_description") or ""
        severity = str(features.get("pain_severity") or "")
        duration = str(features.get("duration_days") or "")
        character = str(features.get("pain_character") or "")
        location = str(features.get("pain_location") or "")
        fever = str(features.get("fever") or "")
        onset = str(features.get("onset") or "")

        is_severe = any(w in severity.lower() for w in ["7", "8", "9", "10", "сильн", "невынос"])
        is_long = any(w in duration.lower() for w in ["недел", "месяц", "давно"])
        is_sudden = any(w in onset.lower() for w in ["внезапн", "резко", "сразу"])
        has_fever = fever and "нет" not in fever.lower() and "нормал" not in fever.lower()

        spec_map = {
            "head": "neurology", "back": "neurology", "abdomen": "gastroenterology",
            "throat": "therapy", "limbs": "orthopedics", "skin": "dermatology",
        }
        specialist_ru = {
            "head": "неврологу", "back": "неврологу", "abdomen": "терапевту или гастроэнтерологу",
            "throat": "терапевту или ЛОР-врачу", "limbs": "травматологу или ревматологу",
            "skin": "дерматологу",
        }
        causes_map = {
            "head": ["Головная боль напряжения (стресс, переутомление)", "Мигрень", "Повышение артериального давления", "Шейный остеохондроз"],
            "back": ["Мышечный спазм или остеохондроз", "Протрузия или грыжа межпозвонкового диска", "Перенапряжение мышц спины"],
            "abdomen": ["Гастрит или язвенная болезнь", "Кишечная колика или СРК", "Панкреатит"],
            "throat": ["ОРВИ (вирусная инфекция)", "Ангина (бактериальная инфекция)", "Фарингит или ларингит"],
            "limbs": ["Артроз или артрит сустава", "Растяжение связок или мышц", "Тендинит после нагрузки"],
            "skin": ["Контактный дерматит", "Аллергическая реакция", "Атопический дерматит"],
        }

        # Build personalized summary
        summary_parts = [f"Основная жалоба: {area_name}."]
        if duration:
            summary_parts.append(f"Длительность: {duration}.")
        if severity:
            summary_parts.append(f"Интенсивность: {severity}.")
        if character:
            summary_parts.append(f"Характер: {character}.")
        if location:
            summary_parts.append(f"Локализация: {location}.")
        if has_fever:
            summary_parts.append(f"Температура: {fever}.")

        # Build explanation
        explanation_parts = [f"По вашим симптомам наиболее вероятна патология в области «{area_name}»."]
        if is_severe:
            explanation_parts.append("Интенсивность жалоб высокая — рекомендуем не откладывать визит к врачу.")
        if is_long:
            explanation_parts.append("Длительное течение симптомов требует углублённого обследования.")
        if is_sudden:
            explanation_parts.append("Внезапное начало симптомов требует внимания специалиста.")
        if has_fever:
            explanation_parts.append("Наличие температуры может указывать на воспалительный процесс.")
        explanation_parts.append("Важно: данная оценка носит информационный характер и не является диагнозом.")

        # Red flags
        red_flags = []
        if is_severe and is_sudden and area == "head":
            red_flags.append("Внезапная сильная головная боль требует исключения сосудистой катастрофы")
        if is_severe and area == "abdomen":
            red_flags.append("Выраженная боль в животе — исключить хирургическую патологию")

        # Recommendations
        specialist = specialist_ru.get(area, "терапевту")
        recs = [f"Запишитесь на консультацию к {specialist}"]
        if is_severe or is_long:
            recs.insert(0, "Не откладывайте визит — симптомы требуют обследования")
        recs.append("Если состояние резко ухудшится — вызовите скорую: 103")

        triage = TriageLevel.URGENT if (is_severe or is_long or red_flags) else TriageLevel.ROUTINE

        return Diagnosis(
            domain=self.code,
            primary_diagnosis=f"Жалобы на {area_name}" + (f", {character}" if character else ""),
            confidence=0.0,
            explanation=" ".join(explanation_parts),
            recommendations=recs,
            triage_level=triage,
            model_version=self.get_model_version(),
            recommended_specialization=spec_map.get(area, "therapy"),
            possible_causes=(causes_map.get(area) or ["Требуется уточнение после осмотра врача"])[:3],
            red_flags=red_flags,
            summary=" ".join(summary_parts),
        )

    def _fallback_diagnosis(self, features: MedicalFeatures) -> Diagnosis:
        return self._smart_diagnosis(features)
