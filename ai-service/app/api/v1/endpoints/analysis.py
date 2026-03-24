from __future__ import annotations

import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_domain_registry, get_session_repo, verify_internal_token
from app.api.v1.schemas.analysis import (
    AnalysisReportResponse,
    AnswerQuestionRequest,
    AnswerQuestionResponse,
    QuestionDto,
    StartAnalysisRequest,
    StartAnalysisResponse,
)
from app.core.entities.analysis_session import AnalysisSession
from app.core.enums import AnalysisStatus
from app.core.interfaces.session_repository import AnalysisSessionRepository
from app.core.symptom_router import detect_symptom_area
from app.domains.registry import DomainRegistry

logger = structlog.get_logger()
router = APIRouter(prefix="/analysis", tags=["analysis"])

DISCLAIMER = (
    "Результаты анализа носят исключительно информационный характер и не являются "
    "медицинским диагнозом. Для постановки диагноза обратитесь к квалифицированному врачу."
)


def _make_question_dto(q) -> QuestionDto:
    return QuestionDto(
        id=q.id,
        question_text=q.question_text,
        question_type=q.question_type,
        options=q.options,
        feature_name=q.feature_name,
        hint=q.hint,
    )


@router.post("/start", response_model=StartAnalysisResponse)
async def start_analysis(
    request: StartAnalysisRequest,
    user_id: str | None = None,
    registry: DomainRegistry = Depends(get_domain_registry),
    session_repo: AnalysisSessionRepository = Depends(get_session_repo),
    _: None = Depends(verify_internal_token),
) -> StartAnalysisResponse:
    # Route to the correct domain based on symptom content, ignoring client-sent domain_code
    symptom_area = detect_symptom_area(request.initial_description)
    actual_domain_code = "cardiology" if symptom_area == "cardiology" else "general"

    domain = registry.get(actual_domain_code)

    session = AnalysisSession(
        id=uuid.uuid4(),
        user_id=uuid.UUID(user_id) if user_id else uuid.uuid4(),
        domain_code=actual_domain_code,
        initial_description=request.initial_description,
        status=AnalysisStatus.STARTED,
    )
    await session_repo.create(session)

    logger.info(
        "analysis.started",
        session_id=str(session.id),
        domain=actual_domain_code,
        symptom_area=symptom_area,
    )

    features = await domain.extract_features(session)
    emergency = await domain.check_emergency(features)
    if emergency:
        await session_repo.update_status(session.id, AnalysisStatus.EMERGENCY.value)
        return StartAnalysisResponse(
            session_id=session.id,
            first_question=None,
            disclaimer=f"⚠️ ВНИМАНИЕ: {emergency}\n\n{DISCLAIMER}",
        )

    question = await domain.generate_next_question(session, features)
    if question:
        await session_repo.add_question(question)
        await session_repo.update_status(session.id, AnalysisStatus.QUESTIONING.value)

    return StartAnalysisResponse(
        session_id=session.id,
        first_question=_make_question_dto(question) if question else None,
        disclaimer=DISCLAIMER,
    )


@router.post("/{session_id}/answer", response_model=AnswerQuestionResponse)
async def answer_question(
    session_id: uuid.UUID,
    request: AnswerQuestionRequest,
    registry: DomainRegistry = Depends(get_domain_registry),
    session_repo: AnalysisSessionRepository = Depends(get_session_repo),
    _: None = Depends(verify_internal_token),
) -> AnswerQuestionResponse:
    session = await session_repo.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await session_repo.update_answer(request.question_id, request.answer)

    domain = registry.get(session.domain_code)
    features = await domain.extract_features(session)

    emergency = await domain.check_emergency(features)
    if emergency:
        await session_repo.update_status(session.id, AnalysisStatus.EMERGENCY.value)
        return AnswerQuestionResponse(next_question=None, is_complete=True)

    next_question = await domain.generate_next_question(session, features)
    if next_question:
        await session_repo.add_question(next_question)
        return AnswerQuestionResponse(
            next_question=_make_question_dto(next_question),
            is_complete=False,
        )

    return AnswerQuestionResponse(next_question=None, is_complete=True)


@router.post("/{session_id}/finalize", response_model=AnalysisReportResponse)
async def finalize_analysis(
    session_id: uuid.UUID,
    registry: DomainRegistry = Depends(get_domain_registry),
    session_repo: AnalysisSessionRepository = Depends(get_session_repo),
    _: None = Depends(verify_internal_token),
) -> AnalysisReportResponse:
    session = await session_repo.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await session_repo.update_status(session.id, AnalysisStatus.ANALYZING.value)

    domain = registry.get(session.domain_code)
    features = await domain.extract_features(session)

    emergency = await domain.check_emergency(features)
    if emergency:
        await session_repo.update_status(session.id, AnalysisStatus.EMERGENCY.value)
        return AnalysisReportResponse(
            session_id=session.id,
            triage_level="EMERGENCY",
            primary_diagnosis=emergency,
            confidence=1.0,
            explanation=emergency,
            recommendations=["Немедленно вызовите скорую помощь — 103"],
            model_version=domain.get_model_version(),
            disclaimer=DISCLAIMER,
            created_at=datetime.now(timezone.utc),
        )

    diagnosis = await domain.predict(features)
    await session_repo.update_status(session.id, AnalysisStatus.COMPLETED.value)

    await session_repo.save_report(session.id, {
        "triage_level": diagnosis.triage_level.value,
        "primary_diagnosis": diagnosis.primary_diagnosis,
        "confidence": diagnosis.confidence,
        "explanation": diagnosis.explanation,
        "recommendations": diagnosis.recommendations,
        "model_version": diagnosis.model_version,
    })

    return AnalysisReportResponse(
        session_id=session.id,
        triage_level=diagnosis.triage_level,
        primary_diagnosis=diagnosis.primary_diagnosis,
        confidence=diagnosis.confidence,
        explanation=diagnosis.explanation,
        recommendations=diagnosis.recommendations,
        model_version=diagnosis.model_version,
        disclaimer=DISCLAIMER,
        created_at=datetime.now(timezone.utc),
    )
