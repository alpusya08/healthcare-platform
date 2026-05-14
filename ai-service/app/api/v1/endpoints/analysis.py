from __future__ import annotations

import io
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, get_domain_registry, get_session_repo, verify_internal_token
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
    db: AsyncSession = Depends(get_db_session),
    _: None = Depends(verify_internal_token),
) -> StartAnalysisResponse:
    symptom_area = detect_symptom_area(request.initial_description)
    actual_domain_code = "cardiology" if symptom_area == "cardiology" else "general"

    domain = registry.get(actual_domain_code)

    session_id = uuid.uuid4()
    resolved_user_id = uuid.UUID(user_id) if user_id else uuid.uuid4()

    session = AnalysisSession(
        id=session_id,
        user_id=resolved_user_id,
        domain_code=actual_domain_code,
        initial_description=request.initial_description,
        status=AnalysisStatus.STARTED,
    )
    await session_repo.create(session)
    await _persist_session_record(db, session)

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


@router.post("/{session_id}/upload")
async def upload_file(
    session_id: uuid.UUID,
    file: UploadFile = File(...),
    session_repo: AnalysisSessionRepository = Depends(get_session_repo),
    _: None = Depends(verify_internal_token),
) -> dict:
    session = await session_repo.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    content_type = file.content_type or ""
    raw = await file.read()
    summary = _extract_file_summary(raw, content_type, file.filename or "")
    await session_repo.add_file_summary(session_id, summary)
    logger.info("analysis.file_uploaded", session_id=str(session_id), filename=file.filename)
    return {"ok": True, "summary": summary}


@router.post("/{session_id}/finalize", response_model=AnalysisReportResponse)
async def finalize_analysis(
    session_id: uuid.UUID,
    registry: DomainRegistry = Depends(get_domain_registry),
    session_repo: AnalysisSessionRepository = Depends(get_session_repo),
    db: AsyncSession = Depends(get_db_session),
    _: None = Depends(verify_internal_token),
) -> AnalysisReportResponse:
    session = await session_repo.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await session_repo.update_status(session.id, AnalysisStatus.ANALYZING.value)

    domain = registry.get(session.domain_code)
    extract_fn = getattr(domain, "extract_features_for_prediction", domain.extract_features)
    features = await extract_fn(session)

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

    report_data = {
        "triage_level": diagnosis.triage_level.value,
        "primary_diagnosis": diagnosis.primary_diagnosis,
        "confidence": diagnosis.confidence,
        "explanation": diagnosis.explanation,
        "recommendations": diagnosis.recommendations,
        "model_version": diagnosis.model_version,
    }
    await session_repo.save_report(session.id, report_data)

    await _persist_session_features(db, session, features, diagnosis)
    if session.domain_code == "general":
        await _persist_general_session(db, session, diagnosis)

    report = AnalysisReportResponse(
        session_id=session.id,
        triage_level=diagnosis.triage_level,
        primary_diagnosis=diagnosis.primary_diagnosis,
        confidence=diagnosis.confidence,
        explanation=diagnosis.explanation,
        recommendations=diagnosis.recommendations,
        model_version=diagnosis.model_version,
        disclaimer=DISCLAIMER,
        created_at=datetime.now(timezone.utc),
        recommended_specialization=diagnosis.recommended_specialization,
        possible_causes=diagnosis.possible_causes,
        red_flags=diagnosis.red_flags,
        summary=diagnosis.summary,
    )
    await _persist_session_report(db, session.id, report)
    return report


@router.get("/{session_id}/report", response_model=AnalysisReportResponse)
async def get_cached_report(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    _: None = Depends(verify_internal_token),
) -> AnalysisReportResponse:
    from app.infrastructure.db.models import SessionReportRecord
    from sqlalchemy import select

    row = (await db.execute(
        select(SessionReportRecord).where(SessionReportRecord.session_id == session_id)
    )).scalar_one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Report not found")

    return AnalysisReportResponse(**row.report)


# ── DB persistence helpers ────────────────────────────────────────────────────

async def _persist_session_record(db: AsyncSession, session: AnalysisSession) -> None:
    try:
        from app.infrastructure.db.models import AnalysisSessionRecord
        record = AnalysisSessionRecord(
            id=session.id,
            user_id=session.user_id,
            domain_code=session.domain_code,
            initial_description=session.initial_description,
            status=session.status.value,
        )
        db.add(record)
        await db.commit()
    except Exception:
        logger.exception("analysis.persist_session_failed", session_id=str(session.id))
        await db.rollback()


async def _persist_session_report(db: AsyncSession, session_id: uuid.UUID, report: AnalysisReportResponse) -> None:
    try:
        from app.infrastructure.db.models import SessionReportRecord
        from sqlalchemy import select

        existing = (await db.execute(
            select(SessionReportRecord).where(SessionReportRecord.session_id == session_id)
        )).scalar_one_or_none()

        if existing:
            return

        record = SessionReportRecord(
            session_id=session_id,
            report=report.model_dump(mode="json"),
        )
        db.add(record)
        await db.commit()
    except Exception:
        logger.exception("analysis.persist_report_failed", session_id=str(session_id))
        await db.rollback()


async def _persist_session_features(db: AsyncSession, session, features, diagnosis) -> None:
    try:
        from app.infrastructure.db.models import SessionFeaturesRecord
        from sqlalchemy import select

        existing = (await db.execute(
            select(SessionFeaturesRecord).where(SessionFeaturesRecord.session_id == session.id)
        )).scalar_one_or_none()

        if existing:
            return

        clean_features = {
            k: v for k, v in features.to_dict().items()
            if not k.startswith("_") and v is not None
        }
        record = SessionFeaturesRecord(
            session_id=session.id,
            domain_code=session.domain_code,
            features=clean_features,
            model_version=diagnosis.model_version,
            prediction_class=getattr(diagnosis, "_class_id", None),
            prediction_confidence=diagnosis.confidence,
        )
        db.add(record)
        await db.commit()
    except Exception:
        logger.exception("analysis.persist_features_failed", session_id=str(session.id))
        await db.rollback()


async def _persist_general_session(db: AsyncSession, session, diagnosis) -> None:
    try:
        from app.infrastructure.db.models import GeneralAiSessionRecord
        from sqlalchemy import select

        existing = (await db.execute(
            select(GeneralAiSessionRecord).where(GeneralAiSessionRecord.session_id == session.id)
        )).scalar_one_or_none()

        if existing:
            return

        dialogue = [
            {"role": "patient_initial", "text": session.initial_description},
        ]
        for q in session.questions:
            dialogue.append({"role": "assistant", "text": q.question_text, "feature": q.feature_name})
            if q.answer:
                dialogue.append({"role": "patient", "text": q.answer, "feature": q.feature_name})

        record = GeneralAiSessionRecord(
            session_id=session.id,
            patient_id=session.user_id,
            detected_domain=session.domain_code,
            full_dialogue=dialogue,
            llm_recommendation=diagnosis.explanation,
        )
        db.add(record)
        await db.commit()
    except Exception:
        logger.exception("analysis.persist_general_session_failed", session_id=str(session.id))
        await db.rollback()


# ── File extraction ───────────────────────────────────────────────────────────

def _extract_file_summary(raw: bytes, content_type: str, filename: str) -> str:
    if "pdf" in content_type or filename.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            pages_text = " ".join(
                (page.extract_text() or "") for page in reader.pages[:5]
            ).strip()
            if pages_text:
                return f"[PDF: {filename}] {pages_text[:2000]}"
        except Exception:
            pass
    if content_type.startswith("image/"):
        return f"[Изображение: {filename}] Медицинский документ — изображение предоставлено пациентом (рентген/ЭКГ/УЗИ)."
    if content_type.startswith("text/"):
        try:
            text = raw.decode("utf-8", errors="replace")[:2000]
            return f"[Текстовый файл: {filename}] {text}"
        except Exception:
            pass
    return f"[Файл: {filename}] Документ предоставлен пациентом (тип: {content_type})."
