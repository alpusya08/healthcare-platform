"""LLM-driven interviewer that collects cardiology features through natural conversation."""
from __future__ import annotations

import json
import uuid
from typing import Optional

import structlog

from app.core.entities.analysis_session import AnalysisSession
from app.core.entities.medical_features import MedicalFeatures
from app.core.entities.question import Question
from app.core.enums import QuestionType
from app.core.interfaces.llm_provider import LLMProvider
from app.domains.cardiology.features import (
    CARDIOLOGY_FEATURES,
    FEATURE_DESCRIPTIONS,
    FEATURE_PRIORITY,
)
from app.domains.cardiology.prompts import EXTRACTION_PROMPT, INTERVIEWER_PROMPT

logger = structlog.get_logger()


class LLMCardiologyInterviewer:
    def __init__(self, llm: LLMProvider) -> None:
        self._llm = llm

    async def extract_features(self, session: AnalysisSession) -> MedicalFeatures:
        try:
            prompt = EXTRACTION_PROMPT.format(
                description=session.initial_description,
                qa_history=session.format_qa_history(),
                file_summaries=session.format_files_summary(),
            )
            raw = await self._llm.complete_structured(prompt, schema={})
            values = {k: raw.get(k) for k in CARDIOLOGY_FEATURES}
            values["_raw_description"] = session.initial_description
            return MedicalFeatures(values=values)
        except Exception:
            logger.exception("llm_interviewer.extraction_failed_using_fallback")
            return self._extract_from_answers(session)

    async def generate_next_question(
        self, session: AnalysisSession, features: MedicalFeatures
    ) -> Optional[Question]:
        next_feature = self._pick_next_feature(session, features)
        if next_feature is None:
            return None

        try:
            return await self._ask_llm(session, features, next_feature)
        except Exception:
            logger.exception("llm_interviewer.question_generation_failed_using_fallback")
            return self._fallback_question(session, next_feature)

    def _pick_next_feature(
        self, session: AnalysisSession, features: MedicalFeatures
    ) -> Optional[str]:
        asked = {q.feature_name for q in session.questions if q.feature_name}
        for feature in FEATURE_PRIORITY:
            if feature not in asked and features.get(feature) is None:
                return feature
        return None

    async def _ask_llm(
        self, session: AnalysisSession, features: MedicalFeatures, next_feature: str
    ) -> Optional[Question]:
        known = {
            k: v for k, v in features.to_dict().items()
            if not k.startswith("_") and v is not None
        }
        known_text = (
            ", ".join(f"{FEATURE_DESCRIPTIONS.get(k, k)}: {v}" for k, v in known.items())
            if known else "нет данных"
        )

        prompt = INTERVIEWER_PROMPT.format(
            initial_description=session.initial_description,
            qa_history=session.format_qa_history(),
            known_features=known_text,
            next_feature_description=FEATURE_DESCRIPTIONS[next_feature],
        )

        raw = await self._llm.complete_structured(prompt, schema={})

        question_text = raw.get("question_text", "").strip()
        if not question_text:
            return self._fallback_question(session, next_feature)

        q_type_str = raw.get("type", "text")
        try:
            q_type = QuestionType(q_type_str)
        except ValueError:
            q_type = QuestionType.TEXT

        return Question(
            id=uuid.uuid4(),
            session_id=session.id,
            question_text=question_text,
            question_type=q_type,
            options=raw.get("options"),
            feature_name=next_feature,
            hint=None,
            order_index=session.questions_count,
        )

    def _fallback_question(self, session: AnalysisSession, feature_name: str) -> Question:
        from app.domains.cardiology.static_questions import _QUESTION_MAP
        q_def = _QUESTION_MAP.get(feature_name)
        if q_def:
            try:
                q_type = QuestionType(q_def["type"])
            except ValueError:
                q_type = QuestionType.TEXT
            return Question(
                id=uuid.uuid4(),
                session_id=session.id,
                question_text=q_def["question_text"],
                question_type=q_type,
                options=q_def.get("options"),
                feature_name=feature_name,
                hint=q_def.get("hint"),
                order_index=session.questions_count,
            )

        description = FEATURE_DESCRIPTIONS.get(feature_name, feature_name)
        return Question(
            id=uuid.uuid4(),
            session_id=session.id,
            question_text=f"Уточните, пожалуйста: {description}",
            question_type=QuestionType.TEXT,
            options=None,
            feature_name=feature_name,
            hint=None,
            order_index=session.questions_count,
        )

    def _extract_from_answers(self, session: AnalysisSession) -> MedicalFeatures:
        values: dict = {k: None for k in CARDIOLOGY_FEATURES}
        values["_raw_description"] = session.initial_description
        for q in session.questions:
            if q.feature_name and q.answer and q.feature_name in CARDIOLOGY_FEATURES:
                values[q.feature_name] = q.answer
        return MedicalFeatures(values=values)
