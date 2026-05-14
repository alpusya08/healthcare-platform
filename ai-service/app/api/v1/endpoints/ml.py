"""ML management endpoints: push doctor feedback and trigger retraining."""
from __future__ import annotations

import uuid
from typing import Optional

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import verify_internal_token, get_db_session
from app.config import get_settings

logger = structlog.get_logger()
router = APIRouter(prefix="/ml", tags=["ml"])


class SessionFeedbackRequest(BaseModel):
    session_id: uuid.UUID
    appointment_id: Optional[uuid.UUID] = None
    verdict: str  # APPROVED | REJECTED | PARTIAL
    corrected_diagnosis: Optional[str] = None


class RetrainResponse(BaseModel):
    status: str
    message: str
    new_f1: Optional[float] = None
    old_f1: Optional[float] = None
    deployed: bool = False


@router.post("/session-feedback")
async def push_session_feedback(
    request: SessionFeedbackRequest,
    db=Depends(get_db_session),
    _: None = Depends(verify_internal_token),
) -> dict:
    """Backend pushes doctor verdict after feedback is submitted."""
    from app.infrastructure.db.models import SessionDoctorFeedbackRecord
    from sqlalchemy import select

    existing = await db.execute(
        select(SessionDoctorFeedbackRecord).where(
            SessionDoctorFeedbackRecord.session_id == request.session_id
        )
    )
    if existing.scalar_one_or_none():
        logger.info("ml.feedback_already_exists", session_id=str(request.session_id))
        return

    record = SessionDoctorFeedbackRecord(
        session_id=request.session_id,
        appointment_id=request.appointment_id,
        verdict=request.verdict,
        corrected_diagnosis=request.corrected_diagnosis,
    )
    db.add(record)
    await db.commit()
    logger.info(
        "ml.feedback_saved",
        session_id=str(request.session_id),
        verdict=request.verdict,
    )
    return {"ok": True}


@router.post("/retrain/cardiology", response_model=RetrainResponse)
async def retrain_cardiology(
    background_tasks: BackgroundTasks,
    db=Depends(get_db_session),
    _: None = Depends(verify_internal_token),
) -> RetrainResponse:
    """
    Collect all cardiology sessions with doctor feedback, combine with original dataset,
    retrain XGBoost. If new model beats champion by F1 — deploy automatically.
    """
    from app.infrastructure.db.models import SessionFeaturesRecord, SessionDoctorFeedbackRecord
    from sqlalchemy import select

    features_rows = (await db.execute(
        select(SessionFeaturesRecord).where(SessionFeaturesRecord.domain_code == "cardiology")
    )).scalars().all()

    feedback_rows = (await db.execute(
        select(SessionDoctorFeedbackRecord)
    )).scalars().all()

    feedback_by_session = {str(f.session_id): f for f in feedback_rows}

    labeled_samples = []
    for feat_row in features_rows:
        feedback = feedback_by_session.get(str(feat_row.session_id))
        if feedback is None:
            continue
        if feedback.verdict == "APPROVED":
            label = feat_row.prediction_class if feat_row.prediction_class is not None else 1
        elif feedback.verdict == "REJECTED":
            label = 1 - (feat_row.prediction_class or 0)
        else:
            continue
        labeled_samples.append({**feat_row.features, "target": label, "source": "feedback"})

    logger.info("ml.retrain_started", feedback_samples=len(labeled_samples))

    settings = get_settings()
    try:
        result = _run_retrain(settings.mlflow_tracking_uri, labeled_samples)
        return RetrainResponse(**result)
    except Exception as exc:
        logger.exception("ml.retrain_failed")
        raise HTTPException(status_code=500, detail=f"Retraining failed: {exc}") from exc


def _run_retrain(mlflow_uri: str, extra_samples: list[dict]) -> dict:
    """Run retraining synchronously (called from endpoint — not background for demo clarity)."""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[5]))

    from app.ml.train_cardiology import retrain_with_feedback
    return retrain_with_feedback(mlflow_uri=mlflow_uri, extra_samples=extra_samples)
