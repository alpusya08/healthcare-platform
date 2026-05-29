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
from app.core.interfaces.ml_predictor import MLPredictor
from app.infrastructure.llm.general_questions import (
    AREA_DISPLAY_NAMES,
    detect_general_area,
    get_questions_for_area,
)

logger = structlog.get_logger()

MAX_QUESTIONS = 8
ML_CONFIDENCE_THRESHOLD = 0.65  # use ML triage if confidence >= this

# 12 general features used by the triage ML model
TRIAGE_FEATURES = [
    "age",
    "sex",
    "symptom_duration_days",
    "pain_severity",
    "onset_type",
    "is_worsening",
    "affects_daily_activity",
    "has_chronic_conditions",
    "takes_medications",
    "prior_similar_episode",
    "associated_symptoms_count",
    "red_flag_present",
]

# All symptom detail features stored for full context
GENERAL_FEATURES = [
    "duration_days", "pain_severity", "pain_character", "pain_location",
    "associated_symptoms", "fever", "food_relation", "radiation",
    "movement_relation", "swelling", "trauma", "movement_limit",
    "cough_type", "throat_pain", "nasal_congestion", "onset",
    "photophobia", "associated_nausea", "spread", "trigger",
    "skin_symptom", "symptom_area",
]

_NON_MEDICAL_RE = re.compile(
    r"\b("
    r"рецепт|приготов|готовить|варить|жарить|испечь|блюдо|кулинар|кухн|манты|плов|борщ|салат|торт|пирог|суп"
    r"|программ|код|алгоритм|python|javascript|java|css|html|sql|скрипт|функци"
    r"|математик|уравнени|задач[аи]|интеграл|производн"
    r"|сочинени|реферат|эссе|стихотворени|перевод|перевести|переведи"
    r"|история|биограф|расскаж|объясни|что\s+такое|как\s+работает"
    r"|погод|курс\s+валют|новост|кино|фильм|игр[аы]|музык"
    r"|шутк|анекдот|привет|здравствуй"
    r")\b",
    re.IGNORECASE,
)

_MEDICAL_RE = re.compile(
    r"\b("
    r"боль|болит|болью|боли|ноет|ломит|жжёт|жжение|покалива"
    r"|температур|жар|лихорадк|озноб|потею|потливост"
    r"|кашел|кашляю|насморк|заложен|чихаю|горло|хрипот"
    r"|голова|головная|мигрен|тошнот|рвот|понос|запор"
    r"|давлени|сердце|сердцебиени|одышк|задыхаюс"
    r"|слабост|усталост|недомогани|головокружен"
    r"|сыпь|зуд|краснот|отёк|опухл|синяк|рана"
    r"|живот|желудок|почки|суставы|спина|поясниц"
    r"|таблетк|препарат|врач|больниц|скорую|симптом|диагноз"
    r")\b",
    re.IGNORECASE,
)


def _is_non_medical_query(description: str) -> bool:
    has_non_medical = bool(_NON_MEDICAL_RE.search(description))
    has_medical = bool(_MEDICAL_RE.search(description))
    return has_non_medical and not has_medical


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
- CRITICAL: Check the "Already collected features" list below. NEVER ask about any feature in that list — it is ALREADY KNOWN.
- CRITICAL: If "duration_days" is in "Already collected features", NEVER ask how long symptoms have lasted. Do NOT rephrase it in any way.
- CRITICAL: Read the initial complaint. If patient mentioned duration (e.g. "3 дня", "уже неделю", "со вчера"), do NOT ask about it.
- Never repeat information already provided in either the complaint or Q&A history
- Never suggest a diagnosis
- Never recommend specific medications or dosages

If you already have enough information to proceed (4+ answered questions), return: {"done": true}

Otherwise return JSON:
{"question_text": "question in Russian", "question_type": "choice", "options": ["option1", "option2", "option3"], "feature_name": "feature_key", "hint": "brief hint in Russian or null"}

question_type: "text" for open-ended, "choice" when specific options make sense (preferred for medical intake).
feature_name must be one of: duration_days, pain_severity, pain_character, pain_location, associated_symptoms, fever, food_relation, radiation, movement_relation, swelling, trauma, onset, photophobia, associated_nausea, trigger, cough_type, throat_pain, nasal_congestion, skin_symptom, spread
"""

_DURATION_RE = re.compile(
    r"\b("
    r"\d+\s*(?:день|дня|дней|д\.?)|"
    r"(?:один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)\s*(?:день|дня|дней)|"
    r"(?:несколько|пару)\s*дней|"
    r"(?:с|со)\s+(?:вчера|позавчера|утра|ночи|вечера)|"
    r"(?:вчера|сегодня|позавчера)\s+(?:началось|начал|появил)|"
    r"неделю?|недели|нескольк[ие]х?\s+недел|"
    r"месяц|давно|долго|уже\s+\d+|уже\s+(?:неделю?|месяц|давно)"
    r")\b",
    re.IGNORECASE,
)

_REPORT_SYSTEM_PROMPT = """\
You are a friendly doctor writing a brief, clear summary for a regular patient (not a medical professional).

IMPORTANT RULES:
- Write in RUSSIAN, in simple everyday language — as if explaining to a friend or family member
- Avoid medical jargon. Replace it with plain words: instead of "цефалгия" say "головная боль", instead of "диспепсия" say "проблемы с желудком", instead of "кардиалгия" say "боль в области сердца"
- Keep sentences short. Max 2 sentences per field.
- Never name specific medications or dosages
- Be warm and reassuring where appropriate, but honest when something needs attention
- End the explanation with: Важно: это предварительная оценка, а не диагноз — обязательно покажитесь врачу.

Return a single JSON object:
{"primary_diagnosis":"1 simple sentence in Russian saying what is likely going on","summary":"1-2 plain sentences summarising the situation","explanation":"2 plain sentences explaining what this probably means for the patient, ending with the disclaimer above","possible_causes":["plain cause 1","plain cause 2","plain cause 3"],"red_flags":[],"recommendations":["simple action 1","simple action 2","simple action 3"],"triage_level":"ROUTINE","recommended_specialization":"therapy","confidence":0.6}

triage_level: EMERGENCY (call ambulance now) / URGENT (see doctor today) / ROUTINE (schedule appointment).
recommended_specialization — use ONLY one of these exact codes: therapy, neurology, cardiology, dermatology, endocrinology, gastroenterology, orthopedics, surgery, pulmonology, otolaryngology.
confidence: 0.0–1.0 reflecting how certain the assessment is.
red_flags: list warning signs in plain language if any, empty array otherwise.
"""

_TRIAGE_FEATURE_EXTRACTION_PROMPT = """\
Extract 12 structured features from this patient intake for ML triage classification.
Return ONLY valid JSON with exactly these keys (all numeric, use null if truly unknown):

{{
  "age": int or null,
  "sex": 0 or 1 (1=male, 0=female) or null,
  "symptom_duration_days": int (0 if started today) or null,
  "pain_severity": int 0-10 or null,
  "onset_type": 0 or 1 (0=gradual, 1=sudden) or null,
  "is_worsening": 0 or 1 or null,
  "affects_daily_activity": 0 or 1 or null,
  "has_chronic_conditions": 0 or 1 or null,
  "takes_medications": 0 or 1 or null,
  "prior_similar_episode": 0 or 1 or null,
  "associated_symptoms_count": int (how many different symptoms mentioned) or null,
  "red_flag_present": 0 or 1 (1 if any: loss of consciousness, paralysis, severe chest pain, blood in stool/vomit, sudden severe headache)
}}

Patient complaint: {description}

Q&A History:
{qa_history}
"""


class GeneralSymptomDomain(MedicalDomain):
    """Universal symptom intake. Claude interviews, extracts features, ML classifies triage."""

    def __init__(self, llm: LLMProvider, predictor: Optional[MLPredictor] = None) -> None:
        self._llm = llm
        self._predictor = predictor

    @property
    def code(self) -> str:
        return "general"

    @property
    def display_name(self) -> str:
        return "Общая симптоматика"

    @property
    def required_features(self) -> list[str]:
        return GENERAL_FEATURES

    def get_model_version(self) -> str:
        if self._predictor is not None:
            return f"hybrid-{self._predictor.model_version}"
        return "general-llm-v1"

    async def extract_features(self, session: AnalysisSession) -> MedicalFeatures:
        area = detect_general_area(session.initial_description)
        answered: dict[str, Any] = {
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

    async def extract_triage_features(self, session: AnalysisSession) -> MedicalFeatures:
        """Extract the 12 ML triage features from the full dialogue."""
        try:
            qa_history = "\n".join(
                f"Q: {q.question_text}\nA: {q.answer}"
                for q in session.questions
                if q.answer
            )
            prompt = (
                _TRIAGE_FEATURE_EXTRACTION_PROMPT
                .replace("{description}", session.initial_description)
                .replace("{qa_history}", qa_history or "Нет ответов на вопросы")
            )
            raw = await self._llm.complete_structured(prompt, {})

            values: dict[str, Any] = {}
            for k in TRIAGE_FEATURES:
                v = raw.get(k)
                if v is not None:
                    try:
                        values[k] = float(v)
                    except (TypeError, ValueError):
                        values[k] = None
                else:
                    values[k] = None

            values["_raw_description"] = session.initial_description
            return MedicalFeatures(values=values)
        except Exception:
            logger.exception("general_domain.triage_feature_extraction_failed")
            return MedicalFeatures(values={"_raw_description": session.initial_description})

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
        raw_desc = features.get("_raw_description") or ""
        if _is_non_medical_query(raw_desc):
            logger.info("general_domain.non_medical_query_detected")
            return Diagnosis(
                domain=self.code,
                primary_diagnosis="Запрос не является медицинским",
                confidence=0.0,
                explanation=(
                    "Описание не содержит медицинских симптомов или жалоб на здоровье. "
                    "Система предназначена для предварительной оценки симптомов и не может помочь с другими запросами."
                ),
                recommendations=[
                    "Опишите симптомы или жалобы на здоровье — что беспокоит, когда началось, где болит",
                    "Укажите давность симптомов и их интенсивность",
                ],
                triage_level=TriageLevel.INSUFFICIENT_DATA,
                model_version=self.get_model_version(),
                recommended_specialization="therapy",
                possible_causes=[],
                red_flags=[],
                summary="",
            )
        try:
            return await self._hybrid_predict(features)
        except Exception:
            logger.exception("general_domain.predict_failed_using_fallback")
            return self._smart_diagnosis(features)

    async def _hybrid_predict(self, features: MedicalFeatures) -> Diagnosis:
        # Always get Claude's full report (diagnosis text, recommendations, etc.)
        llm_diagnosis = await self._llm_predict(features)

        # If ML predictor available and confident — use its triage classification
        if self._predictor is not None:
            try:
                ml_prediction = self._predictor.predict(features)
                if ml_prediction.confidence >= ML_CONFIDENCE_THRESHOLD:
                    triage_map = {
                        "ROUTINE": TriageLevel.ROUTINE,
                        "URGENT": TriageLevel.URGENT,
                        "EMERGENCY": TriageLevel.EMERGENCY,
                    }
                    ml_triage = triage_map.get(ml_prediction.triage_code, TriageLevel.ROUTINE)

                    # Safety check: ML says EMERGENCY but Claude found no red flags
                    # and didn't classify it as EMERGENCY → downgrade to URGENT
                    if (
                        ml_triage == TriageLevel.EMERGENCY
                        and not llm_diagnosis.red_flags
                        and llm_diagnosis.triage_level != TriageLevel.EMERGENCY
                    ):
                        ml_triage = TriageLevel.URGENT
                        logger.info(
                            "general_domain.ml_emergency_downgraded",
                            reason="no_red_flags_and_llm_disagrees",
                            ml_confidence=ml_prediction.confidence,
                            llm_triage=llm_diagnosis.triage_level.value,
                        )
                    else:
                        logger.info(
                            "general_domain.ml_triage_used",
                            ml_triage=ml_prediction.triage_code,
                            confidence=ml_prediction.confidence,
                            llm_triage=llm_diagnosis.triage_level.value,
                        )

                    return Diagnosis(
                        domain=self.code,
                        primary_diagnosis=llm_diagnosis.primary_diagnosis,
                        confidence=ml_prediction.confidence,
                        explanation=llm_diagnosis.explanation,
                        recommendations=llm_diagnosis.recommendations,
                        triage_level=ml_triage,
                        model_version=self.get_model_version(),
                        recommended_specialization=llm_diagnosis.recommended_specialization,
                        possible_causes=llm_diagnosis.possible_causes,
                        red_flags=llm_diagnosis.red_flags,
                        summary=llm_diagnosis.summary,
                    )
            except Exception:
                logger.warning("general_domain.ml_prediction_failed_using_llm_triage")

        return llm_diagnosis

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

        # Auto-mark features already present in the initial description
        implicit: set[str] = set()
        if _DURATION_RE.search(session.initial_description):
            implicit.add("duration_days")
        asked = asked | implicit

        if asked:
            lines.append(f"\n⚠️ ALREADY COLLECTED — DO NOT ASK ABOUT THESE: {', '.join(sorted(asked))}")
            lines.append("You MUST skip any question whose feature_name appears in the list above.")

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
        severity = str(features.get("pain_severity") or "")
        duration = str(features.get("duration_days") or "")
        character = str(features.get("pain_character") or "")
        onset = str(features.get("onset") or "")
        fever = str(features.get("fever") or "")

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
            "head": ["Головная боль напряжения (стресс, переутомление)", "Мигрень", "Повышение артериального давления"],
            "back": ["Мышечный спазм или остеохондроз", "Протрузия или грыжа межпозвонкового диска"],
            "abdomen": ["Гастрит или язвенная болезнь", "Кишечная колика или СРК"],
            "throat": ["ОРВИ (вирусная инфекция)", "Ангина (бактериальная инфекция)"],
            "limbs": ["Артроз или артрит сустава", "Растяжение связок или мышц"],
            "skin": ["Контактный дерматит", "Аллергическая реакция"],
        }

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

        red_flags = []
        if is_severe and is_sudden and area == "head":
            red_flags.append("Внезапная сильная головная боль требует исключения сосудистой катастрофы")

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
            summary=f"Основная жалоба: {area_name}.",
        )
