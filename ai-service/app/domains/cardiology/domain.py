from __future__ import annotations

import json
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
    CONFIDENCE_EARLY_STOP,
    FEATURE_PRIORITY,
    MAX_QUESTIONS,
    TOLERATED_MISSING_THRESHOLD,
)
from app.domains.cardiology.llm_interviewer import LLMCardiologyInterviewer
from app.domains.cardiology.prompts import EXPLANATION_PROMPT
from app.domains.cardiology.static_questions import get_next_static_question
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

    def __init__(
        self,
        llm: LLMProvider,
        predictor: Optional[MLPredictor] = None,
        ai_mode: str = "hybrid",
    ) -> None:
        self._llm = llm
        self._predictor = predictor
        self._ai_mode = ai_mode
        self._interviewer = LLMCardiologyInterviewer(llm)

    async def extract_features(self, session: AnalysisSession) -> MedicalFeatures:
        # Always use LLM to capture features mentioned in the initial description
        # (e.g. "мне 55 лет, мужчина" → age/sex skipped in questions)
        # Fallback to answer-based extraction if LLM fails.
        try:
            llm_features = await self._interviewer.extract_features(session)
        except Exception:
            return self._extract_from_answers(session)

        # Overlay: explicit Q&A answers take priority over LLM-inferred values
        answer_features = self._extract_from_answers(session)
        merged = {}
        for k in CARDIOLOGY_FEATURES:
            af = answer_features.get(k)
            merged[k] = af if af is not None else llm_features.get(k)
        merged["_raw_description"] = session.initial_description
        return MedicalFeatures(values=merged)

    async def extract_features_for_prediction(self, session: AnalysisSession) -> MedicalFeatures:
        try:
            return await self._interviewer.extract_features(session)
        except Exception:
            logger.exception("cardiology_llm_extraction_failed_using_answers")
            return self._extract_from_answers(session)

    def _extract_from_answers(self, session: AnalysisSession) -> MedicalFeatures:
        from app.domains.cardiology.static_questions import OPTION_VALUE_MAP, get_option_numeric_value

        values: dict = {k: None for k in CARDIOLOGY_FEATURES}
        values["_raw_description"] = session.initial_description
        for q in session.questions:
            if not (q.feature_name and q.answer and q.feature_name in CARDIOLOGY_FEATURES):
                continue
            # Known radio-button option → use its numeric value (may be None = impute)
            if q.feature_name in OPTION_VALUE_MAP and q.answer in OPTION_VALUE_MAP[q.feature_name]:
                values[q.feature_name] = OPTION_VALUE_MAP[q.feature_name][q.answer]
                continue
            # Number input or free text → try to parse as float
            try:
                values[q.feature_name] = float(
                    q.answer.replace(",", ".").split("/")[0].split()[0]
                )
            except (ValueError, AttributeError):
                pass  # leave as None — will be imputed or overridden by LLM extraction
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

        # Early stop if XGBoost is confident enough (hybrid mode only, after min questions)
        MIN_QUESTIONS_BEFORE_EARLY_STOP = 3
        if (
            self._ai_mode == "hybrid"
            and self._predictor is not None
            and session.questions_count >= MIN_QUESTIONS_BEFORE_EARLY_STOP
        ):
            try:
                prediction = self._predictor.predict(partial_features)
                if prediction.confidence >= CONFIDENCE_EARLY_STOP:
                    logger.info(
                        "cardiology.early_stop_confident",
                        confidence=prediction.confidence,
                        questions_asked=session.questions_count,
                    )
                    return None
            except Exception:
                pass

        # Use LLM interviewer in hybrid/claude_only, fallback to static
        try:
            return await self._interviewer.generate_next_question(session, partial_features)
        except Exception:
            logger.exception("llm_interviewer_failed_using_static_fallback")
            return get_next_static_question(session, partial_features)

    async def check_emergency(self, features: MedicalFeatures) -> Optional[str]:
        return check_cardiology_emergency(features)

    async def predict(self, features: MedicalFeatures) -> Diagnosis:
        if self._ai_mode == "claude_only" or self._predictor is None:
            return await self._llm_only_predict(features)

        return await self._hybrid_predict(features)

    async def _hybrid_predict(self, features: MedicalFeatures) -> Diagnosis:
        prediction = self._predictor.predict(features)

        if prediction.confidence < 0.50:
            explanation = (
                "Собранных данных недостаточно для однозначного вывода. "
                "Рекомендуется очная консультация кардиолога с ЭКГ и общим осмотром."
            )
            return Diagnosis(
                domain=self.code,
                primary_diagnosis="Недостаточно данных для уверенного диагноза",
                confidence=prediction.confidence,
                explanation=explanation,
                recommendations=["Запишитесь на очный приём к кардиологу"],
                triage_level=TriageLevel.INSUFFICIENT_DATA,
                model_version=self.get_model_version(),
                recommended_specialization="cardiology",
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
            recommended_specialization="cardiology",
        )

    async def _llm_only_predict(self, features: MedicalFeatures) -> Diagnosis:
        from app.domains.cardiology.prompts import EXPLANATION_PROMPT
        try:
            prompt = (
                "Ты кардиолог. На основе данных пациента дай предварительную оценку риска ССЗ.\n\n"
                f"Данные пациента: {json.dumps({k: v for k, v in features.to_dict().items() if not k.startswith('_')}, ensure_ascii=False)}\n\n"
                "Верни JSON: {\"diagnosis\": \"...\", \"confidence\": 0.0-1.0, \"explanation\": \"...\", "
                "\"recommendations\": [\"...\"], \"triage\": \"ROUTINE|URGENT|EMERGENCY\"}"
            )
            raw = await self._llm.complete_structured(prompt, {})
            triage_map = {
                "EMERGENCY": TriageLevel.EMERGENCY,
                "URGENT": TriageLevel.URGENT,
                "ROUTINE": TriageLevel.ROUTINE,
            }
            return Diagnosis(
                domain=self.code,
                primary_diagnosis=raw.get("diagnosis", "Предварительная оценка кардиолога"),
                confidence=float(raw.get("confidence", 0.0)),
                explanation=raw.get("explanation", ""),
                recommendations=raw.get("recommendations", []),
                triage_level=triage_map.get(raw.get("triage", "ROUTINE"), TriageLevel.ROUTINE),
                model_version="claude_only",
                recommended_specialization="cardiology",
            )
        except Exception:
            return self._fallback_prediction(features)

    def get_model_version(self) -> str:
        if self._ai_mode == "claude_only":
            return "claude_only"
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
        recs = ["Запишитесь на приём к кардиологу для подтверждения диагноза"]
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
            recommendations=["Запишитесь на приём к кардиологу"],
            triage_level=TriageLevel.INSUFFICIENT_DATA,
            model_version="no-ml-model",
            recommended_specialization="cardiology",
        )
