from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from app.core.enums import QuestionType


@dataclass
class Question:
    id: UUID
    session_id: UUID
    question_text: str
    question_type: QuestionType
    options: Optional[list[str]] = None
    feature_name: Optional[str] = None
    hint: Optional[str] = None
    answer: Optional[str] = None
    order_index: int = 0
