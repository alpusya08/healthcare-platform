from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import QuestionType, TriageLevel


class StartAnalysisRequest(BaseModel):
    domain_code: str = Field(default="cardiology")
    initial_description: str = Field(min_length=10, max_length=5000)
    consent_given: bool

    def model_post_init(self, __context: object) -> None:
        if not self.consent_given:
            raise ValueError("Необходимо дать согласие на обработку данных")


class QuestionDto(BaseModel):
    id: UUID
    question_text: str
    question_type: QuestionType
    options: Optional[list[str]] = None
    feature_name: Optional[str] = None
    hint: Optional[str] = None


class StartAnalysisResponse(BaseModel):
    session_id: UUID
    first_question: Optional[QuestionDto] = None
    disclaimer: str


class AnswerQuestionRequest(BaseModel):
    question_id: UUID
    answer: str


class AnswerQuestionResponse(BaseModel):
    next_question: Optional[QuestionDto] = None
    is_complete: bool = False


class AnalysisReportResponse(BaseModel):
    session_id: UUID
    triage_level: TriageLevel
    primary_diagnosis: str
    confidence: float = Field(ge=0, le=1)
    explanation: str
    recommendations: list[str]
    model_version: str
    disclaimer: str
    created_at: datetime
