"""Tests for CardiologyDomain — each public method."""
import uuid
from datetime import datetime
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.entities.analysis_session import AnalysisSession
from app.core.entities.diagnosis import Diagnosis, ModelPrediction
from app.core.entities.medical_features import MedicalFeatures
from app.core.enums import AnalysisStatus, TriageLevel
from app.domains.cardiology.domain import CardiologyDomain


def make_session(description: str = "болит грудь") -> AnalysisSession:
    return AnalysisSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        domain_code="cardiology",
        initial_description=description,
        status=AnalysisStatus.QUESTIONING,
    )


def make_features(values: Optional[dict] = None) -> MedicalFeatures:
    base = {
        "age": 55, "sex": 1, "cp": 2, "trestbps": 145, "chol": 250,
        "fbs": 0, "restecg": 0, "thalach": 150, "exang": 1,
        "oldpeak": 2.0, "slope": 2, "ca": 0, "thal": 3,
        "_raw_description": "болит грудь при нагрузке",
    }
    if values:
        base.update(values)
    return MedicalFeatures(values=base)


def make_prediction(class_id: int = 1, confidence: float = 0.85) -> ModelPrediction:
    label = "Выявлены признаки ССЗ" if class_id == 1 else "Признаков ССЗ не выявлено"
    return ModelPrediction(
        class_id=class_id,
        diagnosis=label,
        confidence=confidence,
        raw_probability=confidence,
    )


# ── domain properties ─────────────────────────────────────────────────────────

class TestCardiologyDomainProperties:
    def setup_method(self) -> None:
        self.llm = AsyncMock()
        self.domain = CardiologyDomain(llm=self.llm)

    def test_code(self) -> None:
        assert self.domain.code == "cardiology"

    def test_display_name(self) -> None:
        assert "кардиол" in self.domain.display_name.lower()

    def test_required_features_has_13_items(self) -> None:
        assert len(self.domain.required_features) == 13

    def test_get_model_version_without_predictor(self) -> None:
        assert self.domain.get_model_version() == "no-ml-model"

    def test_get_model_version_with_predictor(self) -> None:
        predictor = MagicMock()
        predictor.model_version = "cardiology-diagnosis@champion"
        domain = CardiologyDomain(llm=self.llm, predictor=predictor)
        assert domain.get_model_version() == "cardiology-diagnosis@champion"


# ── check_emergency ───────────────────────────────────────────────────────────

class TestCardiologyCheckEmergency:
    def setup_method(self) -> None:
        self.llm = AsyncMock()
        self.domain = CardiologyDomain(llm=self.llm)

    @pytest.mark.asyncio
    async def test_emergency_keywords_returns_message(self) -> None:
        f = make_features({"_raw_description": "сильная давящая боль отдает в руку"})
        result = await self.domain.check_emergency(f)
        assert result is not None
        assert "103" in result

    @pytest.mark.asyncio
    async def test_very_high_bp_returns_message(self) -> None:
        f = make_features({"_raw_description": "", "trestbps": 200})
        result = await self.domain.check_emergency(f)
        assert result is not None

    @pytest.mark.asyncio
    async def test_routine_symptoms_returns_none(self) -> None:
        f = make_features({"_raw_description": "иногда покалывает"})
        result = await self.domain.check_emergency(f)
        assert result is None


# ── predict ───────────────────────────────────────────────────────────────────

class TestCardiologyPredict:
    def setup_method(self) -> None:
        self.llm = AsyncMock()
        self.llm.complete = AsyncMock(return_value="Краткое объяснение диагноза.")
        self.predictor = MagicMock()
        self.predictor.model_version = "v2"
        self.domain = CardiologyDomain(llm=self.llm, predictor=self.predictor)

    @pytest.mark.asyncio
    async def test_high_confidence_positive_gives_urgent(self) -> None:
        self.predictor.predict = MagicMock(return_value=make_prediction(class_id=1, confidence=0.85))
        diagnosis = await self.domain.predict(make_features())
        assert diagnosis.triage_level == TriageLevel.URGENT

    @pytest.mark.asyncio
    async def test_high_confidence_negative_gives_routine(self) -> None:
        self.predictor.predict = MagicMock(return_value=make_prediction(class_id=0, confidence=0.80))
        diagnosis = await self.domain.predict(make_features())
        assert diagnosis.triage_level == TriageLevel.ROUTINE

    @pytest.mark.asyncio
    async def test_low_confidence_gives_insufficient_data(self) -> None:
        self.predictor.predict = MagicMock(return_value=make_prediction(class_id=1, confidence=0.45))
        diagnosis = await self.domain.predict(make_features())
        assert diagnosis.triage_level == TriageLevel.INSUFFICIENT_DATA

    @pytest.mark.asyncio
    async def test_no_predictor_returns_fallback(self) -> None:
        domain = CardiologyDomain(llm=self.llm, predictor=None)
        diagnosis = await domain.predict(make_features())
        assert diagnosis.triage_level == TriageLevel.INSUFFICIENT_DATA
        assert diagnosis.confidence == 0.0

    @pytest.mark.asyncio
    async def test_recommendations_populated_for_positive(self) -> None:
        self.predictor.predict = MagicMock(return_value=make_prediction(class_id=1, confidence=0.90))
        diagnosis = await self.domain.predict(make_features())
        assert len(diagnosis.recommendations) > 0

    @pytest.mark.asyncio
    async def test_llm_exception_in_explanation_gracefully_handled(self) -> None:
        self.llm.complete = AsyncMock(side_effect=RuntimeError("LLM timeout"))
        self.predictor.predict = MagicMock(return_value=make_prediction(class_id=1, confidence=0.85))
        diagnosis = await self.domain.predict(make_features())
        # Should fall back to simple explanation, not raise
        assert diagnosis.explanation != ""
        assert diagnosis.triage_level == TriageLevel.URGENT


# ── extract_features ──────────────────────────────────────────────────────────

class TestCardiologyExtractFeatures:
    def setup_method(self) -> None:
        self.llm = AsyncMock()
        self.domain = CardiologyDomain(llm=self.llm)

    @pytest.mark.asyncio
    async def test_returns_medical_features_with_raw_description(self) -> None:
        self.llm.complete_structured = AsyncMock(return_value={"age": 55, "sex": 1})
        session = make_session("мне 55, мужчина, болит сердце")
        features = await self.domain.extract_features(session)
        assert features.get("_raw_description") == "мне 55, мужчина, болит сердце"
        assert features.get("age") == 55

    @pytest.mark.asyncio
    async def test_unknown_keys_from_llm_are_excluded(self) -> None:
        self.llm.complete_structured = AsyncMock(return_value={"age": 55, "unknown_field": "garbage"})
        session = make_session("тест")
        features = await self.domain.extract_features(session)
        assert features.get("unknown_field") is None


# ── generate_next_question ────────────────────────────────────────────────────

class TestCardiologyGenerateNextQuestion:
    def setup_method(self) -> None:
        self.llm = AsyncMock()
        self.domain = CardiologyDomain(llm=self.llm)

    @pytest.mark.asyncio
    async def test_returns_question_when_features_missing(self) -> None:
        empty_features = MedicalFeatures(values={"_raw_description": "болит"})
        self.llm.complete_structured = AsyncMock(return_value={
            "question_text": "Сколько вам лет?",
            "type": "number",
            "feature_name": "age",
        })
        session = make_session()
        question = await self.domain.generate_next_question(session, empty_features)
        assert question is not None
        assert question.question_text == "Сколько вам лет?"

    @pytest.mark.asyncio
    async def test_returns_none_when_all_features_present(self) -> None:
        full_features = make_features()
        session = make_session()
        question = await self.domain.generate_next_question(session, full_features)
        assert question is None

    @pytest.mark.asyncio
    async def test_returns_none_when_max_questions_reached(self) -> None:
        from app.core.entities.question import Question
        from app.core.enums import QuestionType
        session = make_session()
        for i in range(7):
            session.questions.append(Question(
                id=uuid.uuid4(), session_id=session.id,
                question_text=f"Q{i}", question_type=QuestionType.TEXT,
                order_index=i,
            ))
        empty_features = MedicalFeatures(values={"_raw_description": "тест"})
        question = await self.domain.generate_next_question(session, empty_features)
        assert question is None
