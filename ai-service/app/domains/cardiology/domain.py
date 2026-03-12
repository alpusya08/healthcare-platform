from __future__ import annotations

import json
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
from app.core.interfaces.ml_predictor import MLPredictor
from app.domains.cardiology.features import (
    CARDIOLOGY_FEATURES,
    FEATURE_PRIORITY,
    MAX_QUESTIONS,
    TOLERATED_MISSING_THRESHOLD,
)
from app.domains.cardiology.prompts import (
    EXPLANATION_PROMPT,
    EXTRACTION_PROMPT,
    QUESTION_GENERATION_PROMPT,
)
from app.domains.cardiology.triage_rules import check_cardiology_emergency

logger = structlog.get_logger()


class CardiologyDomain(MedicalDomain):
    @property
    def code(self) -> str:
        return "cardiology"

    @property
    def display_name(self) -> str:
        return "Кардиология"

    @property
    def required_features(self) -> list[str]:
        return list(CARDIOLOGY_FEATURES)

    def __init__(self, llm: LLMProvider, predictor: Optional[MLPredictor] = None) -> None:
        self._llm = llm
        self._predictor = predictor

    async def extract_features(self, session: AnalysisSession) -> MedicalFeatures:
        prompt = EXTRACTION_PROMPT.format(
            description=session.initial_description,
            qa_history=session.format_qa_history(),
            file_summaries=session.format_files_summary(),
        )
        raw = await self._llm.complete_structured(prompt, schema={})
        values = {k: raw.get(k) for k in CARDIOLOGY_FEATURES}
        values["_raw_description"] = session.initial_description
        return MedicalFeatures(values=values)

    async def generate_next_question(
        self, session: AnalysisSession, partial_features: MedicalFeatures
    ) -> Optional[Question]:
        is_non_cardiac = session.initial_description.startswith("[NON-CARDIAC]")
        max_q = 4 if is_non_cardiac else MAX_QUESTIONS
        if session.questions_count >= max_q:
            return None

        missing = partial_features.missing_fields(CARDIOLOGY_FEATURES)
        if len(missing) <= TOLERATED_MISSING_THRESHOLD:
            return None

        prioritized = [f for f in FEATURE_PRIORITY if f in missing]
        prompt = QUESTION_GENERATION_PROMPT.format(
            description=session.initial_description,
            qa_history=session.format_qa_history(),
            asked_questions_count=session.questions_count,
            missing_features=", ".join(prioritized[:5]),
        )

        try:
            raw = await self._llm.complete_structured(prompt, schema={})
            q_type = QuestionType(raw.get("type", "text"))
            return Question(
                id=uuid.uuid4(),
                session_id=session.id,
                question_text=raw["question_text"],
                question_type=q_type,
                options=raw.get("options"),
                feature_name=raw.get("feature_name"),
                hint=raw.get("hint"),
                order_index=session.questions_count,
            )
        except Exception:
            logger.exception("question_generation_failed")
            return None

    async def check_emergency(self, features: MedicalFeatures) -> Optional[str]:
        return check_cardiology_emergency(features)

    async def predict(self, features: MedicalFeatures) -> Diagnosis:
        if self._predictor is None:
            return self._fallback_prediction(features)

        prediction = self._predictor.predict(features)

        if prediction.confidence < 0.6:
            explanation = (
                "Недостаточно данных для уверенного диагноза. "
                "Рекомендуется очная консультация кардиолога и дополнительные обследования (ЭКГ, ЭхоКГ)."
            )
            return Diagnosis(
                domain=self.code,
                primary_diagnosis="Недостаточно данных для уверенного диагноза",
                confidence=prediction.confidence,
                explanation=explanation,
                recommendations=["Запишитесь на очный прием к кардиологу"],
                triage_level=TriageLevel.INSUFFICIENT_DATA,
                model_version=self.get_model_version(),
            )

        explanation = await self._generate_explanation(prediction, features)

        triage = TriageLevel.ROUTINE
        if prediction.confidence >= 0.75 and prediction.class_id == 1:
            triage = TriageLevel.URGENT

        return Diagnosis(
            domain=self.code,
            primary_diagnosis=prediction.diagnosis,
            confidence=prediction.confidence,
            explanation=explanation,
            recommendations=self._build_recommendations(prediction),
            triage_level=triage,
            model_version=self.get_model_version(),
        )

    def get_model_version(self) -> str:
        if self._predictor is not None:
            return self._predictor.model_version
        return "no-ml-model"

    async def _generate_explanation(self, prediction, features: MedicalFeatures) -> str:
        try:
            prompt = EXPLANATION_PROMPT.format(
                diagnosis=prediction.diagnosis,
                confidence=prediction.confidence,
                features=json.dumps(
                    {k: v for k, v in features.to_dict().items() if not k.startswith("_")},
                    ensure_ascii=False,
                ),
                feature_importances=prediction.feature_importances or {},
            )
            return await self._llm.complete(prompt)
        except Exception:
            logger.exception("explanation_generation_failed")
            return f"Предварительный анализ: {prediction.diagnosis} (уверенность: {prediction.confidence:.0%})."

    def _build_recommendations(self, prediction) -> list[str]:
        recs = ["Запишитесь на прием к кардиологу для подтверждения диагноза"]
        if prediction.class_id == 1:
            recs.append("Рекомендуется ЭКГ и ЭхоКГ")
            recs.append("Контроль артериального давления и холестерина")
        return recs

    def _fallback_prediction(self, features: MedicalFeatures) -> Diagnosis:
        return Diagnosis(
            domain=self.code,
            primary_diagnosis="Предварительный анализ (без ML-модели)",
            confidence=0.0,
            explanation="ML-модель не загружена. Для получения предсказания необходимо обучить модель.",
            recommendations=["Запишитесь на прием к кардиологу"],
            triage_level=TriageLevel.INSUFFICIENT_DATA,
            model_version="no-ml-model",
        )
