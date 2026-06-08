from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import QuestionType, TriageLevel


class StartAnalysisRequest(BaseModel):
    domain_code: str = Field(default="general")
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
    is_non_medical: bool = False


class AnswerQuestionRequest(BaseModel):
    question_id: UUID
    answer: str


class AnswerQuestionResponse(BaseModel):
    next_question: Optional[QuestionDto] = None
    is_complete: bool = False


class DiagnosisCandidateDto(BaseModel):
    code: str
    name_ru: str
    name_lay_ru: str
    probability: float = Field(ge=0, le=1)
    icd10: Optional[str] = None


class NextStepItem(BaseModel):
    timeframe: str
    action: str
    detail: str = ""


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
    recommended_specialization: str = "therapy"
    possible_causes: list[str] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list)
    summary: str = ""
    candidate_diagnoses: list[DiagnosisCandidateDto] = Field(default_factory=list)
    next_steps: list[NextStepItem] = Field(default_factory=list)
    pain_severity: Optional[int] = None
    symptom_duration_days: Optional[int] = None
    is_worsening: Optional[bool] = None
    uploaded_files: list[str] = Field(default_factory=list)
