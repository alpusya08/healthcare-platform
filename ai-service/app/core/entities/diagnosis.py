from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.core.enums import TriageLevel


@dataclass
class DiagnosisCandidate:
    """One diagnosis hypothesis predicted by a domain ML model."""
    code: str
    name_ru: str
    name_lay_ru: str
    probability: float
    icd10: Optional[str] = None


@dataclass
class Diagnosis:
    domain: str
    primary_diagnosis: str
    confidence: float
    explanation: str
    recommendations: list[str] = field(default_factory=list)
    triage_level: TriageLevel = TriageLevel.ROUTINE
    model_version: str = "unknown"
    recommended_specialization: str = "therapy"
    possible_causes: list[str] = field(default_factory=list)
    red_flags: list[str] = field(default_factory=list)
    summary: str = ""
    candidate_diagnoses: list[DiagnosisCandidate] = field(default_factory=list)
    next_steps: list[dict] = field(default_factory=list)
    pain_severity: Optional[int] = None
    symptom_duration_days: Optional[int] = None
    is_worsening: Optional[bool] = None


@dataclass
class ModelPrediction:
    class_id: int
    diagnosis: str
    confidence: float
    raw_probability: float
    feature_importances: Optional[dict[str, float]] = None
    triage_code: str = "ROUTINE"
