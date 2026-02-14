from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.core.enums import FeedbackVerdict


@dataclass
class DoctorFeedback:
    id: UUID
    session_id: UUID
    doctor_id: UUID
    verdict: FeedbackVerdict
    comment: Optional[str] = None
    created_at: datetime | None = None
