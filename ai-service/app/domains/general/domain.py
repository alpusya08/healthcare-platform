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
You are a medical AI assistant helping to gather clinical information from a patient.
The patient has described their symptoms. Your job is to ask ONE focused follow-up question
to better understand their condition.

Rules:
- Ask exactly one question per turn
- Make the question feel natural and conversational, NOT like a form field
- Tailor the question specifically to what the patient just described
- Do not repeat information the patient already gave
- Do not suggest diagnoses yet
- If you have enough information (symptoms, duration, severity, context), return null for the question

Respond ONLY with valid JSON in this exact format:
{
  "question_text": "Your question here in Russian",
  "question_type": "text" | "choice" | "scale",
  "options": ["option1", "option2"] or null,
  "feature_name": "one_of_the_feature_names",
  "hint": "optional clarifying hint in Russian or null"
}

If enough information is already collected, respond with:
{"done": true}

Feature names to use (pick the most relevant):
duration_days, pain_severity, pain_character, pain_location, associated_symptoms,
fever, food_relation, radiation, movement_relation, swelling, trauma, movement_limit,
cough_type, throat_pain, nasal_congestion, onset, photophobia, associated_nausea,
spread, trigger, skin_symptom
"""

_REPORT_SYSTEM_PROMPT = """\
You are an experienced general practitioner reviewing a patient's symptom intake.
Based on the conversation below, produce a structured clinical assessment.

Respond ONLY with valid JSON in this exact format:
{
  "primary_diagnosis": "Brief working diagnosis in Russian (1 sentence)",
  "summary": "Clinical summary of the chief complaint and key findings in Russian (2-3 sentences)",
  "explanation": "Patient-friendly explanation of what might be happening, in Russian (3-5 sentences)",
  "possible_causes": ["cause1 in Russian", "cause2", "cause3"],
  "red_flags": ["flag1 in Russian if present"] or [],
  "recommendations": ["rec1 in Russian", "rec2", "rec3"],
  "triage_level": "EMERGENCY" | "URGENT" | "ROUTINE",
  "recommended_specialization": "therapy" | "neurology" | "cardiology" | "surgery" | "dermatology" | "orthopedics" | "gastroenterology",
  "confidence": 0.0
}

Always end explanation with:
"Важно: данная оценка носит информационный характер и не является диагнозом."

For triage_level:
- EMERGENCY: life-threatening symptoms (stroke signs, acute abdomen, severe allergic reaction)
- URGENT: significant symptoms needing same-day or next-day care
- ROUTINE: non-urgent, can wait for scheduled appointment
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
        except Exception as exc:
            logger.warning("llm_question_failed_falling_back", error=str(exc))
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
        except Exception as exc:
            logger.warning("llm_predict_failed_falling_back", error=str(exc))
            return self._fallback_diagnosis(features)

    def get_model_version(self) -> str:
        return "general-llm-v1"

    async def _llm_next_question(
        self, session: AnalysisSession, partial_features: MedicalFeatures
    ) -> Optional[Question]:
        prompt = self._build_question_prompt(session, partial_features)
        raw = await self._llm.complete_structured(prompt, {})

        if raw.get("done"):
            return None

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
            feature_name=raw.get("feature_name", f"llm_q_{session.questions_count}"),
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

    def _fallback_diagnosis(self, features: MedicalFeatures) -> Diagnosis:
        area = features.get("symptom_area") or "general"
        area_name = AREA_DISPLAY_NAMES.get(area, "симптомы")
        severity_raw = str(features.get("pain_severity") or "")
        is_severe = any(w in severity_raw.lower() for w in ["7–8", "9–10", "сильн", "невынос"])

        spec_map = {
            "head": "neurology", "back": "neurology", "abdomen": "gastroenterology",
            "throat": "therapy", "limbs": "orthopedics", "skin": "dermatology",
        }
        specialist_ru = {
            "head": "неврологу", "back": "неврологу", "abdomen": "терапевту или гастроэнтерологу",
            "throat": "терапевту или ЛОР-врачу", "limbs": "травматологу или ревматологу",
            "skin": "дерматологу",
        }

        return Diagnosis(
            domain=self.code,
            primary_diagnosis=f"Жалобы на {area_name}",
            confidence=0.0,
            explanation=(
                f"По описанным симптомам можно предположить проблемы в области «{area_name}». "
                "Для точного диагноза необходим осмотр врача.\n\n"
                "Важно: данная оценка носит информационный характер и не является диагнозом."
            ),
            recommendations=[
                f"Запишитесь на консультацию к {specialist_ru.get(area, 'терапевту')}",
                "Если состояние ухудшится — вызовите скорую: 103",
            ],
            triage_level=TriageLevel.URGENT if is_severe else TriageLevel.ROUTINE,
            model_version=self.get_model_version(),
            recommended_specialization=spec_map.get(area, "therapy"),
            possible_causes=["Требуется уточнение после осмотра врача"],
            red_flags=[],
            summary=f"Жалобы на {area_name}. {features.get('_raw_description', '')}",
        )
