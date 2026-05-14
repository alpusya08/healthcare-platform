from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AnalysisSessionRecord(Base):
    __tablename__ = "analysis_sessions"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    domain_code: Mapped[str] = mapped_column(String(50), nullable=False)
    initial_description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="STARTED")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class SessionFeaturesRecord(Base):
    """Extracted ML feature vector saved at finalization for retraining."""
    __tablename__ = "session_features"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("analysis_sessions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    domain_code: Mapped[str] = mapped_column(String(50), nullable=False)
    features: Mapped[dict] = mapped_column(JSONB, nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prediction_class: Mapped[int | None] = mapped_column(nullable=True)
    prediction_confidence: Mapped[float | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class GeneralAiSessionRecord(Base):
    """Full dialogue saved for general-branch sessions — used for future model training."""
    __tablename__ = "general_ai_sessions"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("analysis_sessions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    patient_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    detected_domain: Mapped[str | None] = mapped_column(String(50), nullable=True)
    full_dialogue: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    llm_recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    doctor_feedback: Mapped[str | None] = mapped_column(String(30), nullable=True)
    doctor_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )


class SessionDoctorFeedbackRecord(Base):
    """Doctor verdict pushed from backend for retraining loop."""
    __tablename__ = "session_doctor_feedback"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    appointment_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    verdict: Mapped[str] = mapped_column(String(30), nullable=False)  # APPROVED / REJECTED / PARTIAL
    corrected_diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
