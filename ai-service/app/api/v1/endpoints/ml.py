"""ML management endpoints: push doctor feedback and trigger triage model retraining."""
from __future__ import annotations

import uuid
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException
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
    # True triage label from doctor (overrides ML prediction for retraining)
    true_triage_level: Optional[str] = None  # ROUTINE | URGENT | EMERGENCY


class RetrainResponse(BaseModel):
    status: str
    message: str
    new_f1: Optional[float] = None
    old_f1: Optional[float] = None
    deployed: bool = False


class MlStatsResponse(BaseModel):
    total_analyses: int
    total_with_feedback: int
    approved: int
    rejected: int
    partial: int
    model_version: str
    champion_confidence_avg: float


@router.get("/stats", response_model=MlStatsResponse)
async def get_ml_stats(
    db=Depends(get_db_session),
    _: None = Depends(verify_internal_token),
) -> MlStatsResponse:
    from app.infrastructure.db.models import SessionFeaturesRecord, SessionDoctorFeedbackRecord
    from sqlalchemy import select, func

    total_analyses = (await db.execute(select(func.count(SessionFeaturesRecord.id)))).scalar_one()

    feedback_rows = (await db.execute(select(SessionDoctorFeedbackRecord))).scalars().all()
    total_with_feedback = len(feedback_rows)
    approved = sum(1 for f in feedback_rows if f.verdict == "APPROVED")
    rejected = sum(1 for f in feedback_rows if f.verdict == "REJECTED")
    partial = sum(1 for f in feedback_rows if f.verdict == "PARTIAL")

    avg_confidence_row = (await db.execute(
        select(func.avg(SessionFeaturesRecord.prediction_confidence)).where(
            SessionFeaturesRecord.prediction_confidence.is_not(None)
        )
    )).scalar_one()
    avg_confidence = float(avg_confidence_row) if avg_confidence_row is not None else 0.0

    latest_version_row = (await db.execute(
        select(SessionFeaturesRecord.model_version)
        .where(SessionFeaturesRecord.model_version.is_not(None))
        .order_by(SessionFeaturesRecord.created_at.desc())
        .limit(1)
    )).scalar_one_or_none()
    model_version = latest_version_row or "triage_xgb_v1"

    return MlStatsResponse(
        total_analyses=total_analyses,
        total_with_feedback=total_with_feedback,
        approved=approved,
        rejected=rejected,
        partial=partial,
        model_version=model_version,
        champion_confidence_avg=round(avg_confidence, 4),
    )


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
        return {"ok": True, "skipped": True}

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


@router.post("/retrain/triage", response_model=RetrainResponse)
async def retrain_triage(
    db=Depends(get_db_session),
    _: None = Depends(verify_internal_token),
) -> RetrainResponse:
    """
    Collect all sessions with doctor feedback, build labeled triage dataset,
    retrain XGBoost. If new model beats champion F1-macro — deploy automatically.

    Feedback → triage label mapping:
    - APPROVED: use ML's predicted triage_level as ground truth
    - REJECTED + true_triage_level provided: use doctor's label
    - REJECTED without label: invert predicted triage (ROUTINE↔URGENT)
    - PARTIAL: skip (uncertain label)
    """
    from app.infrastructure.db.models import SessionFeaturesRecord, SessionDoctorFeedbackRecord
    from sqlalchemy import select

    _TRIAGE_CODE_TO_INT = {"ROUTINE": 0, "URGENT": 1, "EMERGENCY": 2}
    _INT_TO_TRIAGE = {0: "ROUTINE", 1: "URGENT", 2: "EMERGENCY"}

    features_rows = (await db.execute(
        select(SessionFeaturesRecord)
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
        if feedback.verdict == "PARTIAL":
            continue  # skip uncertain feedback

        features = feat_row.features or {}

        if feedback.verdict == "APPROVED":
            # Doctor confirmed — use the predicted triage class
            pred_class = feat_row.prediction_class
            if pred_class is None:
                continue
            triage_label = pred_class
        elif feedback.verdict == "REJECTED":
            # Doctor corrected — check if true_triage_level was stored in corrected_diagnosis
            if feedback.corrected_diagnosis and feedback.corrected_diagnosis.upper() in _TRIAGE_CODE_TO_INT:
                triage_label = _TRIAGE_CODE_TO_INT[feedback.corrected_diagnosis.upper()]
            else:
                # Invert: ROUTINE↔URGENT, EMERGENCY stays
                pred = feat_row.prediction_class or 0
                triage_label = 1 - pred if pred < 2 else 1
        else:
            continue

        sample = {k: v for k, v in features.items() if not k.startswith("_")}
        sample["triage_level"] = triage_label
        labeled_samples.append(sample)

    logger.info("ml.retrain_started", feedback_samples=len(labeled_samples))

    settings = get_settings()
    try:
        result = _run_retrain(settings.mlflow_tracking_uri, labeled_samples)
        return RetrainResponse(**result)
    except Exception as exc:
        logger.exception("ml.retrain_failed")
        raise HTTPException(status_code=500, detail=f"Retraining failed: {exc}") from exc


def _run_retrain(mlflow_uri: str, extra_samples: list[dict]) -> dict:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parents[5]))

    from app.ml.train_triage import retrain_with_feedback
    return retrain_with_feedback(mlflow_uri=mlflow_uri, extra_samples=extra_samples)
